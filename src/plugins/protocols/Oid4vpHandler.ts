import type {
  IProtocolHandler,
  ProtocolContext,
  ProtocolResult,
  PendingPresentationRequest,
} from '../types';
import type { VerifiableCredential } from '@/types';
import { sha256 } from '@noble/hashes/sha2.js';
import { credentialRepository } from '@/services/credentialRepository';
import { didJwkProvider } from '../did/DidJwkProvider';
import { didKeyProvider } from '../did/DidKeyProvider';
import {
  bytesToBase64Url,
  parseJwtUnsafe,
  stringToBase64Url,
} from '../utils/jwtUtils';
import { INTEGRATION_CONFIG } from '@/config/integration';
import {
  normalizeVerifierContextUrl,
  normalizeVerifierPayload,
} from '@/utils/integrationUrls';

interface RequestObject {
  client_id?: string;
  response_uri?: string;
  redirect_uri?: string;
  response_mode?: string;
  request_uri_method?: string;
  state?: string;
  nonce?: string;
  client_metadata?: Record<string, unknown>;
  dcql_query?: {
    credentials?: {
      id?: string;
      format?: string;
      meta?: { type?: string; vct_values?: string[] };
      claims?: { path?: string[] }[];
    }[];
  };
}

type DcqlCredentialQuery = NonNullable<
  NonNullable<RequestObject['dcql_query']>['credentials']
>[number];
type DcqlClaim = NonNullable<DcqlCredentialQuery['claims']>[number];

interface StoredPresentationRequest {
  requestObject: RequestObject;
  matched: {
    credential: VerifiableCredential;
    disclosedClaims: string[];
    queryId: string;
  }[];
  verifier: string;
}

const REQUEST_OBJECT_MEDIA_TYPE = 'application/oauth-authz-req+jwt';
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

function parseOpenid4vpUri(uri: string): {
  requestUri?: string;
  requestJwt?: string;
  requestUriMethod?: string;
} {
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
    requestJwt: url.searchParams.get('request') || undefined,
    requestUriMethod: url.searchParams.get('request_uri_method') || undefined,
  };
}

function buildWalletMetadata() {
  return {
    response_types_supported: ['vp_token'],
    response_modes_supported: ['direct_post'],
    client_id_prefixes_supported: [
      'pre-registered',
      'redirect_uri',
      'x509_san_dns',
      'x509_hash',
      'decentralized_identifier',
    ],
    request_object_signing_alg_values_supported: ['ES256', 'ES512', 'RS256', 'EdDSA'],
    vp_formats_supported: {
      'dc+sd-jwt': {
        'sd-jwt_alg_values': ['EdDSA', 'ES256', 'RS256'],
        'kb-jwt_alg_values': ['EdDSA', 'ES256', 'RS256'],
      },
    },
  };
}

async function fetchRequestObjectJwt(
  requestUri: string,
  requestUriMethod?: string
): Promise<string> {
  const method = (requestUriMethod || 'get').toUpperCase();
  if (method === 'POST') {
    const body = new URLSearchParams({
      wallet_metadata: JSON.stringify(buildWalletMetadata()),
      wallet_nonce: `${Date.now()}`,
    });
    const response = await fetch(requestUri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: REQUEST_OBJECT_MEDIA_TYPE,
      },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch request object (${response.status})`);
    }
    return response.text();
  }

  const response = await fetch(requestUri, {
    method: 'GET',
    headers: {
      Accept: REQUEST_OBJECT_MEDIA_TYPE,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch request object (${response.status})`);
  }
  return response.text();
}

function parseRequestObjectJwt(jwt: string): RequestObject {
  const { payload } = parseJwtUnsafe(jwt.trim());
  return normalizeVerifierPayload(payload as RequestObject);
}

function extractDisclosedClaims(
  query: DcqlCredentialQuery
): string[] {
  return (query?.claims ?? [])
    .map((claim: DcqlClaim) => claim.path?.join('.'))
    .filter((claim: string | undefined): claim is string => Boolean(claim));
}

function normalizeVctCandidate(value: string): string {
  return value.trim().toLowerCase().replace(/^urn:eu\.europa\.ec\./, 'urn:');
}

function matchCredentialQuery(
  credential: VerifiableCredential,
  query: DcqlCredentialQuery
): boolean {
  if (query.format && query.format !== 'dc+sd-jwt' && query.format !== 'vc+sd-jwt') {
    return false;
  }

  if (query.meta?.type) {
    return Array.isArray(credential.type) && credential.type.includes(query.meta.type);
  }

  const requestedVcts = query.meta?.vct_values ?? [];
  if (requestedVcts.length > 0) {
    const candidates = new Set<string>(
      [
        ...(Array.isArray(credential.type) ? credential.type : []),
        credential.visual?.description ?? '',
      ]
        .filter(Boolean)
        .map((value: string) => normalizeVctCandidate(value))
    );
    return requestedVcts.some((vct: string) =>
      candidates.has(normalizeVctCandidate(vct))
    );
  }

  return true;
}

function selectMatches(
  requestObject: RequestObject,
  credentials: VerifiableCredential[]
): StoredPresentationRequest['matched'] {
  const queries = requestObject.dcql_query?.credentials ?? [];
  return queries
    .map((query, index) => {
      const credential = credentials.find((item) => matchCredentialQuery(item, query));
      if (!credential) return null;
      return {
        credential,
        disclosedClaims: extractDisclosedClaims(query),
        queryId: query.id ?? `cred_${index + 1}`,
      };
    })
    .filter(
      (
        item
      ): item is {
        credential: VerifiableCredential;
        disclosedClaims: string[];
        queryId: string;
      } => Boolean(item)
    );
}

async function buildKeyBindingJwt(
  presentedSdJwt: string,
  requestObject: RequestObject
): Promise<string> {
  const issuerJwt = presentedSdJwt.split('~')[0];
  const { payload } = parseJwtUnsafe(issuerJwt);
  const cnf = payload.cnf as { jwk?: { kty?: string; crv?: string } } | undefined;
  const aud = requestObject.client_id;
  const nonce = requestObject.nonce;

  if (!aud || !nonce) {
    throw new Error('OID4VP request object is missing client_id or nonce for key binding');
  }

  const sdHash = bytesToBase64Url(sha256(new TextEncoder().encode(presentedSdJwt)));
  const now = Math.floor(Date.now() / 1000);

  let alg: 'ES256' | 'EdDSA' = 'EdDSA';
  let sign: (input: Uint8Array) => Promise<Uint8Array>;

  if (cnf?.jwk?.kty === 'EC' && cnf.jwk.crv === 'P-256') {
    const meta = await didJwkProvider.getStoredMetadata();
    if (!meta) {
      throw new Error('Missing DID:JWK key required for SD-JWT key binding');
    }
    alg = 'ES256';
    sign = (input: Uint8Array) => didJwkProvider.sign(input, meta.keyId);
  } else {
    const meta = await didKeyProvider.getStoredMetadata();
    if (!meta) {
      throw new Error('Missing DID:key required for SD-JWT key binding');
    }
    sign = (input: Uint8Array) => didKeyProvider.sign(input, meta.keyId);
  }

  const header = {
    typ: 'kb+jwt',
    alg,
  };
  const payloadForKb = {
    iat: now,
    aud,
    nonce,
    sd_hash: sdHash,
  };

  const signingInput = `${stringToBase64Url(JSON.stringify(header))}.${stringToBase64Url(
    JSON.stringify(payloadForKb)
  )}`;
  const signature = await sign(new TextEncoder().encode(signingInput));
  return `${signingInput}.${bytesToBase64Url(signature)}`;
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
      const { requestUri, requestJwt, requestUriMethod } = parseOpenid4vpUri(uri);
      const jwt =
        requestJwt ??
        (requestUri
          ? await fetchRequestObjectJwt(
              normalizeVerifierContextUrl(requestUri),
              requestUriMethod
            )
          : undefined);

      if (!jwt) {
        return { type: 'error', message: 'OID4VP request object is missing' };
      }

      const requestObject = parseRequestObjectJwt(jwt);
      const verifier = extractVerifierName(requestObject);
      const matchedCredentials = selectMatches(requestObject, ctx.credentials);

      if (matchedCredentials.length === 0) {
        return {
          type: 'error',
          message: 'No matching credentials found for this presentation request.',
        };
      }

      const presentationId = `vp-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
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

  async submitPresentation(
    presentationId: string,
    ctx: ProtocolContext
  ): Promise<ProtocolResult> {
    const stored = _pendingRequests.get(presentationId);
    if (!stored) {
      return {
        type: 'error',
        message: 'Presentation request not found or already submitted.',
      };
    }

    const responseUri =
      stored.requestObject.response_uri || stored.requestObject.redirect_uri;
    if (!responseUri) {
      return { type: 'error', message: 'response_uri missing in request object' };
    }

    if (
      stored.requestObject.response_mode &&
      stored.requestObject.response_mode !==
        INTEGRATION_CONFIG.verifier.defaultResponseMode
    ) {
      return {
        type: 'error',
        message: `Unsupported response_mode: ${stored.requestObject.response_mode}`,
      };
    }

    try {
      const vpToken: Record<string, string[]> = {};

      for (const match of stored.matched) {
        const repoHit = credentialRepository.getById(match.credential.id);
        const rawCredential = repoHit?.raw ?? match.credential._raw;
        if (!rawCredential) {
          return {
            type: 'error',
            message: `No raw credential token available for ${match.credential.id}`,
          };
        }

        let presentationEntry = rawCredential;
        if (
          match.credential._format === 'sd-jwt-vc' &&
          match.disclosedClaims.length > 0
        ) {
          const formatHandler = ctx.registry.getCredentialFormat('sd-jwt-vc');
          presentationEntry = await formatHandler.selectDisclose(
            rawCredential,
            match.disclosedClaims
          );
        }

        if (match.credential._format === 'sd-jwt-vc') {
          const kbJwt = await buildKeyBindingJwt(presentationEntry, stored.requestObject);
          presentationEntry = presentationEntry.endsWith('~')
            ? `${presentationEntry}${kbJwt}`
            : `${presentationEntry}~${kbJwt}`;
        }

        vpToken[match.queryId] = [presentationEntry];
      }

      const body = new URLSearchParams({
        state: stored.requestObject.state || '',
        vp_token: JSON.stringify(vpToken),
      });

      const submitRes = await fetch(normalizeVerifierContextUrl(responseUri), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      });

      if (!submitRes.ok) {
        return {
          type: 'error',
          message: `VP submission failed (${submitRes.status})`,
        };
      }

      const contentType = submitRes.headers.get('content-type') || '';
      const verificationResult = contentType.includes('application/json')
        ? ((await submitRes.json()) as Record<string, unknown>)
        : ({ status: 'ok' } as Record<string, unknown>);

      _pendingRequests.delete(presentationId);
      return {
        type: 'presentation_sent',
        verifier: stored.verifier,
        verificationResult,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { type: 'error', message: `VP submission error: ${message}` };
    }
  }
}

export const oid4vpHandler = new Oid4vpHandler();
