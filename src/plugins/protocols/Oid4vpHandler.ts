import { Openid4vpClient } from '@openid4vc/openid4vp';
import { DcqlQuery } from 'dcql';

import type { IProtocolHandler, ProtocolContext, ProtocolResult, PendingPresentationRequest } from '../types';
import { buildOid4vpCallbacks } from '../utils/oid4vcCallbacks';
import type { VerifiableCredential } from '@/types';
import { credentialRepository } from '@/services/credentialRepository';

// ── Pending request store (in-process, not persisted) ─────────────────────────

// ── VerifiableCredential → DcqlCredential adapter ────────────────────────────

/**
 * Adapts our display-model VerifiableCredential to the shape expected by
 * `DcqlQuery.query()` from the `dcql` npm package.
 */
function vcToDcqlCredential(vc: VerifiableCredential): Record<string, unknown> {
  const isSdJwt =
    vc.type.includes('SdJwtVcCredential') ||
    vc.type.some((t) => t.includes('sd-jwt'));
  const isMdoc =
    vc.type.includes('MdocCredential') ||
    vc.type.some((t) => t.startsWith('org.iso.') || t.startsWith('eu.europa.'));
  const claims = vc.credentialSubject as Record<string, unknown>;

  if (isSdJwt) {
    const vct =
      vc.type.find((t) => t !== 'VerifiableCredential' && t !== 'SdJwtVcCredential') ??
      vc.type[vc.type.length - 1];
    return { credential_format: 'dc+sd-jwt', vct, claims, cryptographic_holder_binding: true };
  }

  if (isMdoc) {
    const docType =
      vc.type.find((t) => t !== 'VerifiableCredential' && t !== 'MdocCredential') ??
      vc.type[vc.type.length - 1];
    return { credential_format: 'mso_mdoc', doctype: docType, claims, cryptographic_holder_binding: true };
  }

  return { credential_format: 'jwt_vc_json', type: vc.type, claims, cryptographic_holder_binding: true };
}

interface StoredPresentationRequest {
  authorizationRequestPayload: Record<string, unknown>;
  matched: Array<{
    credential: VerifiableCredential;
    disclosedClaims: string[];
    queryId: string;
  }>;
  verifier: string;
}

const _pendingRequests = new Map<string, StoredPresentationRequest>();

export function getPendingPresentationRequest(id: string): StoredPresentationRequest | undefined {
  return _pendingRequests.get(id);
}

export function clearPendingPresentationRequest(id: string): void {
  _pendingRequests.delete(id);
}

// ── VP token builder ──────────────────────────────────────────────────────────

/**
 * Build the `vp_token` for a DCQL-based response.
 * For SD-JWT VC, applies selective disclosure. For other formats, returns raw.
 */
async function buildDcqlVpToken(
  matches: StoredPresentationRequest['matched'],
  ctx: ProtocolContext
): Promise<Record<string, string>> {
  const vpToken: Record<string, string> = {};

  for (const { credential, disclosedClaims, queryId } of matches) {
    // Prefer raw from CredentialRepository; fall back to _raw on display model
    const stored = credentialRepository.getById(credential.id);
    const rawCredential = stored?.raw ?? (credential as VerifiableCredential & { _raw?: string })._raw;

    if (!rawCredential) {
      // No raw token available — use ID as placeholder (should not happen in production)
      vpToken[queryId] = credential.id ?? queryId;
      continue;
    }

    // For SD-JWT VC, apply selective disclosure
    const isSdJwt =
      Array.isArray(credential.type) &&
      (credential.type.includes('SdJwtVcCredential') || credential.type.some((t) => t.includes('sd-jwt')));

    if (isSdJwt) {
      const formatHandler = ctx.registry.getCredentialFormat('sd-jwt-vc');
      vpToken[queryId] = await formatHandler.selectDisclose(rawCredential, disclosedClaims);
    } else {
      vpToken[queryId] = rawCredential;
    }
  }

  return vpToken;
}

// ── Verifier name extraction ──────────────────────────────────────────────────

function extractVerifierName(authRequest: Record<string, unknown>): string {
  const clientId = authRequest.client_id;
  if (typeof clientId === 'string') {
    // Trim DID prefix for readability
    if (clientId.startsWith('did:')) return clientId.slice(0, 40) + '…';
    try {
      const host = new URL(clientId).hostname;
      if (host) return host;
    } catch {
      // Not a URL
    }
    return clientId;
  }
  return 'Unknown verifier';
}

// ── Oid4vpHandler ─────────────────────────────────────────────────────────────

/**
 * OID4VP protocol handler.
 * Handles `openid4vp://` and `eudi-openid4vp://` deep links.
 *
 * Returns `{ type: 'presentation_request' }` so the UI can show a confirmation
 * screen before the response is actually submitted.
 * Call `walletProtocolService.submitPresentation(presentationId)` to proceed.
 */
export class Oid4vpHandler implements IProtocolHandler {
  readonly scheme = 'openid4vp';

  canHandle(uri: string): boolean {
    return (
      uri.startsWith('openid4vp://') ||
      uri.startsWith('eudi-openid4vp://') ||
      uri.startsWith('haip://') ||
      uri.includes('openid4vp') && uri.includes('request_uri')
    );
  }

  async handle(uri: string, ctx: ProtocolContext): Promise<ProtocolResult> {
    const callbacks = buildOid4vpCallbacks();
    const client = new Openid4vpClient({ callbacks });

    try {
      // 1. Parse the URI into an authorization request object
      const parsed = client.parseOpenid4vpAuthorizationRequest({
        authorizationRequest: uri,
      });

      // 2. Resolve (fetch request_uri / verify JAR if needed)
      const resolved = await client.resolveOpenId4vpAuthorizationRequest({
        authorizationRequestPayload: parsed.params as import('@openid4vc/openid4vp').Openid4vpAuthorizationRequest,
      });

      const authPayload = resolved.authorizationRequestPayload as Record<string, unknown>;
      const verifier = extractVerifierName(authPayload);

      // 3. Match credentials
      let matchedCredentials: StoredPresentationRequest['matched'] = [];

      if (resolved.dcql?.query) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dcqlQuery = DcqlQuery.parse(resolved.dcql.query as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dcqlCredentials = ctx.credentials.map(vcToDcqlCredential) as any[];
        const queryResult = DcqlQuery.query(dcqlQuery, dcqlCredentials);

        if (queryResult.can_be_satisfied) {
          for (const [queryId, match] of Object.entries(queryResult.credential_matches)) {
            if (match.success && match.valid_credentials?.[0] !== undefined) {
              const idx = match.valid_credentials[0].input_credential_index;
              const credential = ctx.credentials[idx];
              const credQuery = dcqlQuery.credentials.find((c) => c.id === queryId);
              // Extract full claim paths for selective disclosure (supports nested paths)
              const disclosedClaims = (credQuery?.claims ?? [])
                .filter((c): c is { path: [string, ...string[]] } => 'path' in c)
                .map((c) => c.path.join('.'));
              matchedCredentials.push({ credential, disclosedClaims, queryId });
            }
          }
        }
      } else if (resolved.pex?.presentation_definition) {
        // PEX fallback — match all credentials (no fine-grained DCQL matching)
        // Full PEX engine integration deferred; use all credentials as candidates
        matchedCredentials = ctx.credentials.map((vc) => ({
          credential: vc,
          disclosedClaims: [],
          queryId: 'default',
        }));
      }

      if (matchedCredentials.length === 0) {
        return {
          type: 'error',
          message: 'No matching credentials found for this presentation request.',
        };
      }

      // 4. Store pending request and return to UI for confirmation
      const presentationId = `vp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      _pendingRequests.set(presentationId, {
        authorizationRequestPayload: authPayload,
        matched: matchedCredentials,
        verifier,
      });

      const pendingRequest: PendingPresentationRequest = {
        verifier,
        presentationId,
        matches: matchedCredentials.map((m) => ({
          credential: m.credential,
          disclosedClaims: m.disclosedClaims,
          queryId: m.queryId,
        })),
      };

      return { type: 'presentation_request', request: pendingRequest };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { type: 'error', message: `OID4VP error: ${message}` };
    }
  }

  /** Submit the stored presentation after user confirmation. */
  async submitPresentation(
    presentationId: string,
    ctx: ProtocolContext
  ): Promise<ProtocolResult> {
    const stored = getPendingPresentationRequest(presentationId);
    if (!stored) {
      return { type: 'error', message: 'Presentation request not found or already submitted.' };
    }

    const callbacks = buildOid4vpCallbacks();
    const client = new Openid4vpClient({ callbacks });

    try {
      const vpToken = await buildDcqlVpToken(stored.matched, ctx);

      // Build authorization response payload
      const authorizationResponsePayload = {
        vp_token: vpToken,
      };

      const responseResult = await client.createOpenid4vpAuthorizationResponse({
        authorizationRequestPayload: stored.authorizationRequestPayload as import('@openid4vc/openid4vp').Openid4vpAuthorizationRequest,
        authorizationResponsePayload,
      });

      await client.submitOpenid4vpAuthorizationResponse({
        authorizationRequestPayload: stored.authorizationRequestPayload as import('@openid4vc/openid4vp').Openid4vpAuthorizationRequest,
        authorizationResponsePayload: responseResult.authorizationResponsePayload,
        ...(responseResult.jarm ? { jarm: { responseJwt: responseResult.jarm.responseJwt } } : {}),
      });

      clearPendingPresentationRequest(presentationId);
      return { type: 'presentation_sent', verifier: stored.verifier };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { type: 'error', message: `VP submission error: ${message}` };
    }
  }
}

export const oid4vpHandler = new Oid4vpHandler();
