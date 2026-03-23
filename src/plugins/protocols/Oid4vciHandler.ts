import { Openid4vciClient } from '@openid4vc/openid4vci';

import type { IProtocolHandler, ProtocolContext, ProtocolResult } from '../types';
import type { CredentialFormatName } from '../types';
import { buildOid4vcCallbacks } from '../utils/oid4vcCallbacks';

// ── Format detection ──────────────────────────────────────────────────────────

function toFormatName(format: string | undefined): CredentialFormatName {
  if (!format) return 'jwt_vc_json';
  if (format === 'vc+sd-jwt' || format === 'dc+sd-jwt') return 'sd-jwt-vc';
  if (format === 'jwt_vc_json' || format === 'jwt_vc') return 'jwt_vc_json';
  return format as CredentialFormatName;
}

function extractRawCredential(
  credentialResponse: import('@openid4vc/openid4vci').CredentialResponse
): string {
  if (Array.isArray(credentialResponse.credentials) && credentialResponse.credentials.length > 0) {
    const first = credentialResponse.credentials[0];
    if (typeof first === 'string') return first;
    if (first && typeof (first as { credential?: unknown }).credential === 'string') {
      return (first as { credential: string }).credential;
    }
  }
  if (typeof credentialResponse.credential === 'string') {
    return credentialResponse.credential;
  }
  throw new Error('No credential found in issuer response');
}

// ── Auth code flow pending state ──────────────────────────────────────────────

interface PendingAuthCodeState {
  credentialOffer: import('@openid4vc/openid4vci').CredentialOfferObject;
  issuerMetadata: import('@openid4vc/openid4vci').IssuerMetadataResult;
  pkceCodeVerifier?: string;
  ctx: ProtocolContext;
}

const _pendingAuthCodeRequests = new Map<string, PendingAuthCodeState>();

// ── Oid4vciHandler ────────────────────────────────────────────────────────────

/**
 * OID4VCI protocol handler.
 * Handles `openid-credential-offer://` and `openid4vci://` deep links.
 *
 * Pre-authorized code flow executes fully inline.
 * Authorization code flow:
 *   1. Returns `{ type: 'redirect', url }` — caller opens URL in browser.
 *   2. Browser redirects to `did://oid4vci/callback?code=...&state=...`.
 *   3. `canHandle()` recognises the callback URI; `handle()` resumes the flow.
 */
export class Oid4vciHandler implements IProtocolHandler {
  readonly scheme = 'openid-credential-offer';

  canHandle(uri: string): boolean {
    return (
      uri.startsWith('openid-credential-offer://') ||
      uri.startsWith('openid4vci://') ||
      uri.includes('credential_offer') ||
      uri.includes('credential_offer_uri') ||
      // Auth code callback
      (uri.startsWith('did://oid4vci/callback') && uri.includes('code='))
    );
  }

  async handle(uri: string, ctx: ProtocolContext): Promise<ProtocolResult> {
    // ── Auth code callback branch ─────────────────────────────────────────────
    if (uri.startsWith('did://oid4vci/callback')) {
      return this._handleAuthCodeCallback(uri);
    }

    // ── Credential offer branch ───────────────────────────────────────────────
    const callbacks = buildOid4vcCallbacks();
    const client = new Openid4vciClient({ callbacks });

    try {
      // 1. Resolve offer
      const offer = await client.resolveCredentialOffer(uri);

      // 2. Fetch issuer metadata
      const issuerMetadata = await client.resolveIssuerMetadata(offer.credential_issuer);

      // 3. Determine grant type
      const grants = offer.grants ?? {};
      const preAuthGrant =
        grants['urn:ietf:params:oauth:grant-type:pre-authorized_code'] ?? null;

      if (!preAuthGrant) {
        // Authorization code flow — signal caller to open browser
        const authResult = await client.initiateAuthorization({
          credentialOffer: offer,
          issuerMetadata,
          clientId: 'wallet',
          redirectUri: 'did://oid4vci/callback',
        });

        if ('authorizationRequestUrl' in authResult) {
          // Store pending state keyed by a generated state value
          const state = `oid4vci-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          _pendingAuthCodeRequests.set(state, {
            credentialOffer: offer,
            issuerMetadata,
            pkceCodeVerifier: authResult.pkce?.codeVerifier,
            ctx,
          });

          // Append state to the auth URL so the callback can look it up
          const separator = authResult.authorizationRequestUrl.includes('?') ? '&' : '?';
          const urlWithState = `${authResult.authorizationRequestUrl}${separator}state=${state}`;

          return { type: 'redirect', url: urlWithState };
        }
        return { type: 'error', message: 'Authorization flow not supported in this version' };
      }

      // 4. Retrieve access token (pre-auth flow)
      const { accessTokenResponse } = await client.retrievePreAuthorizedCodeAccessTokenFromOffer({
        credentialOffer: offer,
        issuerMetadata,
        // txCode: undefined — if required, caller must inject via context
      });

      return this._retrieveAndPersistCredentials(
        client,
        issuerMetadata,
        accessTokenResponse.access_token,
        offer.credential_configuration_ids ?? [],
        ctx
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { type: 'error', message: `OID4VCI error: ${message}` };
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async _handleAuthCodeCallback(callbackUri: string): Promise<ProtocolResult> {
    const parsed = new URL(callbackUri.replace('did://', 'https://'));
    const code = parsed.searchParams.get('code');
    const state = parsed.searchParams.get('state');

    if (!code) {
      return { type: 'error', message: 'Auth code callback missing `code` parameter' };
    }
    if (!state) {
      return { type: 'error', message: 'Auth code callback missing `state` parameter' };
    }

    const pending = _pendingAuthCodeRequests.get(state);
    if (!pending) {
      return { type: 'error', message: 'No pending auth code request found for this state' };
    }
    _pendingAuthCodeRequests.delete(state);

    const callbacks = buildOid4vcCallbacks();
    const client = new Openid4vciClient({ callbacks });

    try {
      const { accessTokenResponse } =
        await client.retrieveAuthorizationCodeAccessTokenFromOffer({
          credentialOffer: pending.credentialOffer,
          issuerMetadata: pending.issuerMetadata,
          authorizationCode: code,
          pkceCodeVerifier: pending.pkceCodeVerifier,
          redirectUri: 'did://oid4vci/callback',
        });

      return this._retrieveAndPersistCredentials(
        client,
        pending.issuerMetadata,
        accessTokenResponse.access_token,
        pending.credentialOffer.credential_configuration_ids ?? [],
        pending.ctx
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { type: 'error', message: `Auth code callback error: ${message}` };
    }
  }

  private async _retrieveAndPersistCredentials(
    client: Openid4vciClient,
    issuerMetadata: import('@openid4vc/openid4vci').IssuerMetadataResult,
    accessToken: string,
    credentialConfigIds: string[],
    ctx: ProtocolContext
  ): Promise<ProtocolResult> {
    if (credentialConfigIds.length === 0) {
      return { type: 'error', message: 'No credential configurations in offer' };
    }

    const receivedCredentials: import('@/types').VerifiableCredential[] = [];

    for (const configId of credentialConfigIds) {
      const response = await client.retrieveCredentials({
        issuerMetadata,
        accessToken,
        credentialConfigurationId: configId,
      });

      const raw = extractRawCredential(response.credentialResponse);

      const configMeta =
        issuerMetadata.credentialIssuer.credential_configurations_supported?.[configId];
      const formatName = toFormatName(configMeta?.format as string | undefined);

      const formatHandler = ctx.registry.getCredentialFormat(formatName);
      const parsedCredential = await formatHandler.parse(raw);
      const displayModel = formatHandler.toDisplayModel(parsedCredential);
      displayModel._raw = raw;
      displayModel._format = parsedCredential.format;
      receivedCredentials.push(displayModel);
    }

    return { type: 'credential_received', credentials: receivedCredentials };
  }
}

export const oid4vciHandler = new Oid4vciHandler();
