import type { CredentialFormatName } from '@/wallet-core/types/credential';
import type {
  ProtocolContext,
  ProtocolResult,
} from '@/wallet-core/types/contracts';
import { normalizeIssuerContextUrl } from '@/wallet-core/transport/urlResolver';
import { oid4vciCallbacks } from './client';
import type { IssuerCredentialResponse } from './types';
import { resolveCredentialConfiguration } from './offerResolver';

function toFormatName(format: string | undefined): CredentialFormatName {
  if (!format) return 'jwt_vc_json';
  if (format === 'vc+sd-jwt' || format === 'dc+sd-jwt') return 'sd-jwt-vc';
  if (format === 'jwt_vc_json' || format === 'jwt_vc') return 'jwt_vc_json';
  if (format === 'mso_mdoc') return 'mso_mdoc';
  return format as CredentialFormatName;
}

function inferFormatFromRawCredential(rawCredential: string): CredentialFormatName {
  if (rawCredential.includes('~')) {
    return 'sd-jwt-vc';
  }
  if (rawCredential.split('.').length === 3) {
    return 'jwt_vc_json';
  }
  return 'mso_mdoc';
}

export async function requestCredentialWithIssuerCompat(options: {
  accessToken: string;
  credentialIssuer: string;
  credentialConfigurationId: string;
  proofJwt: string;
}): Promise<IssuerCredentialResponse> {
  const endpoint = normalizeIssuerContextUrl(
    `${options.credentialIssuer.replace(/\/$/, '')}/wallet/credentialEndpoint`
  );

  const response = await oid4vciCallbacks.fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${options.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      credential_configuration_id: options.credentialConfigurationId,
      proofs: {
        jwt: [options.proofJwt],
      },
    }),
  });

  const rawText = await response.text();
  let payload: unknown = null;
  try {
    payload = rawText ? (JSON.parse(rawText) as unknown) : null;
  } catch {
    payload = rawText;
  }

  if (!response.ok) {
    const details =
      typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    throw new Error(
      `Error retrieving credentials from '${options.credentialIssuer}'\n${details}`
    );
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Issuer returned an empty credential response.');
  }

  return payload as IssuerCredentialResponse;
}

export function extractRawCredential(credentialResponse: IssuerCredentialResponse): string {
  if (typeof credentialResponse.credential === 'string') {
    return credentialResponse.credential;
  }

  const first = credentialResponse.credentials?.[0];
  if (typeof first === 'string') {
    return first;
  }
  if (
    first &&
    typeof first === 'object' &&
    'credential' in first &&
    typeof (first as { credential?: unknown }).credential === 'string'
  ) {
    return (first as { credential: string }).credential;
  }

  throw new Error('Issuer response does not contain a compact credential string');
}

export async function toCredentialReceivedResult(
  ctx: ProtocolContext,
  credentialConfigurationId: string,
  issuerMetadata: unknown,
  credentialResponse: IssuerCredentialResponse
): Promise<ProtocolResult> {
  const rawCredential = extractRawCredential(credentialResponse);
  const resolvedConfiguration = resolveCredentialConfiguration(
    credentialConfigurationId,
    issuerMetadata
  );
  const formatName =
    resolvedConfiguration.rawFormat
      ? toFormatName(resolvedConfiguration.rawFormat)
      : inferFormatFromRawCredential(rawCredential);
  const handler = ctx.registry.getCredentialFormat(formatName);
  const parsedCredential = await handler.parse(rawCredential);
  const displayModel = handler.toDisplayModel(parsedCredential);
  displayModel._raw = rawCredential;
  displayModel._format = parsedCredential.format;

  return { type: 'credential_received', credentials: [displayModel] };
}
