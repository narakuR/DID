import type {
  IProtocolHandler,
  ProtocolContext,
  ProtocolResult,
  PendingPresentationRequest,
} from '../types';
import type { VerifiableCredential } from '@/types';
import { credentialRepository } from '@/services/credentialRepository';

interface RequestObject {
  client_id?: string;
  response_uri?: string;
  state?: string;
  nonce?: string;
  dcql_query?: {
    credentials?: Array<{
      id?: string;
      meta?: { type?: string };
      claims?: Array<{ path?: string[] }>;
    }>;
  };
}

interface StoredPresentationRequest {
  requestObject: RequestObject;
  matched: Array<{
    credential: VerifiableCredential;
    disclosedClaims: string[];
    queryId: string;
  }>;
  verifier: string;
}

const _pendingRequests = new Map<string, StoredPresentationRequest>();

function extractVerifierName(authRequest: RequestObject): string {
  if (!authRequest.client_id) return 'Unknown verifier';
  if (authRequest.client_id.startsWith('did:')) return authRequest.client_id.slice(0, 40) + '…';
  try {
    return new URL(authRequest.client_id).hostname;
  } catch {
    return authRequest.client_id;
  }
}

function parseOpenid4vpUri(uri: string): { requestUri?: string } {
  const normalized = uri.startsWith('openid4vp://')
    ? uri.replace('openid4vp://', 'https://dummy.local')
    : uri.startsWith('eudi-openid4vp://')
      ? uri.replace('eudi-openid4vp://', 'https://dummy.local')
      : uri.startsWith('haip://')
        ? uri.replace('haip://', 'https://dummy.local')
        : uri;
  const url = new URL(normalized);
  return {
    requestUri: url.searchParams.get('request_uri')
      ? decodeURIComponent(url.searchParams.get('request_uri') as string)
      : undefined,
  };
}

function selectMatches(
  requestObject: RequestObject,
  credentials: VerifiableCredential[]
): StoredPresentationRequest['matched'] {
  const query = requestObject.dcql_query?.credentials?.[0];
  const requiredType = query?.meta?.type;
  const disclosedClaims = (query?.claims ?? [])
    .map((claim) => claim.path?.join('.'))
    .filter((claim): claim is string => Boolean(claim));

  const matched = credentials.filter((credential) => {
    if (!requiredType) return true;
    return Array.isArray(credential.type) && credential.type.includes(requiredType);
  });

  return matched.map((credential) => ({
    credential,
    disclosedClaims,
    queryId: query?.id ?? 'cred_1',
  }));
}

export class Oid4vpHandler implements IProtocolHandler {
  readonly scheme = 'openid4vp';

  canHandle(uri: string): boolean {
    return (
      uri.startsWith('openid4vp://') ||
      uri.startsWith('eudi-openid4vp://') ||
      uri.startsWith('haip://') ||
      (uri.includes('openid4vp') && uri.includes('request_uri'))
    );
  }

  async handle(uri: string, ctx: ProtocolContext): Promise<ProtocolResult> {
    try {
      const { requestUri } = parseOpenid4vpUri(uri);
      if (!requestUri) {
        return { type: 'error', message: 'OID4VP request_uri is missing' };
      }

      const reqRes = await fetch(requestUri);
      if (!reqRes.ok) {
        return { type: 'error', message: `Failed to fetch request object (${reqRes.status})` };
      }

      const requestObject = (await reqRes.json()) as RequestObject;
      const verifier = extractVerifierName(requestObject);
      const matchedCredentials = selectMatches(requestObject, ctx.credentials);

      if (matchedCredentials.length === 0) {
        return {
          type: 'error',
          message: 'No matching credentials found for this presentation request.',
        };
      }

      const presentationId = `vp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      _pendingRequests.set(presentationId, {
        requestObject,
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

  async submitPresentation(presentationId: string, _ctx: ProtocolContext): Promise<ProtocolResult> {
    const stored = _pendingRequests.get(presentationId);
    if (!stored) {
      return { type: 'error', message: 'Presentation request not found or already submitted.' };
    }

    const responseUri = stored.requestObject.response_uri;
    if (!responseUri) {
      return { type: 'error', message: 'response_uri missing in request object' };
    }

    try {
      const first = stored.matched[0];
      const repoHit = credentialRepository.getById(first.credential.id);
      const vpToken = repoHit?.raw ?? first.credential._raw;

      if (!vpToken) {
        return { type: 'error', message: 'No raw credential token available for submission' };
      }

      const submitRes = await fetch(responseUri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vp_token: vpToken,
          state: stored.requestObject.state,
        }),
      });

      if (!submitRes.ok) {
        return { type: 'error', message: `VP submission failed (${submitRes.status})` };
      }

      const verificationResult = (await submitRes.json()) as Record<string, unknown>;
      _pendingRequests.delete(presentationId);

      return { type: 'presentation_sent', verifier: stored.verifier, verificationResult };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { type: 'error', message: `VP submission error: ${message}` };
    }
  }
}

export const oid4vpHandler = new Oid4vpHandler();
