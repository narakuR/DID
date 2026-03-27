import { parseJwtUnsafe } from '@/wallet-core/utils/jwtUtils';
import { normalizeVerifierContextUrl, normalizeVerifierPayload } from '@/wallet-core/transport/urlResolver';
import type { RequestObject } from './types';

const REQUEST_OBJECT_MEDIA_TYPE = 'application/oauth-authz-req+jwt';

export function extractVerifierName(authRequest: RequestObject): string {
  if (!authRequest.client_id) return 'Unknown verifier';
  if (authRequest.client_id.startsWith('did:')) return `${authRequest.client_id.slice(0, 40)}…`;
  try {
    return new URL(authRequest.client_id).hostname;
  } catch {
    return authRequest.client_id;
  }
}

export function parseOpenid4vpUri(uri: string): {
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

export async function fetchRequestObjectJwt(
  requestUri: string,
  requestUriMethod?: string
): Promise<string> {
  const method = (requestUriMethod || 'get').toUpperCase();
  const normalizedUri = normalizeVerifierContextUrl(requestUri);

  if (method === 'POST') {
    const body = new URLSearchParams({
      wallet_metadata: JSON.stringify(buildWalletMetadata()),
      wallet_nonce: `${Date.now()}`,
    });
    const response = await fetch(normalizedUri, {
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

  const response = await fetch(normalizedUri, {
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

export function parseRequestObjectJwt(jwt: string): RequestObject {
  const { payload } = parseJwtUnsafe(jwt.trim());
  return normalizeVerifierPayload(payload as RequestObject);
}
