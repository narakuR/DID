import type { CredentialFormatName } from '@/wallet-core/types/credential';
import type {
  ProtocolContext,
  ProtocolResult,
} from '@/wallet-core/types/contracts';
import { normalizeIssuerContextUrl } from '@/wallet-core/transport/urlResolver';
import { oid4vciCallbacks } from './client';
import type { IssuerCredentialResponse } from './types';
import { resolveCredentialConfiguration } from './offerResolver';
import { finalizePendingMdocBinding } from '@/wallet-core/domain/DocumentKeyStore';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toFormatName(format: string | undefined): CredentialFormatName {
  if (!format) return 'jwt_vc_json';
  if (format === 'vc+sd-jwt' || format === 'dc+sd-jwt') return 'sd-jwt-vc';
  if (format === 'jwt_vc_json' || format === 'jwt_vc') return 'jwt_vc_json';
  if (format === 'mso_mdoc') return 'mso_mdoc';
  return format as CredentialFormatName;
}

function inferFormatFromRawCredential(rawCredential: string): CredentialFormatName {
  const trimmed = rawCredential.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'mso_mdoc';
  }
  if (rawCredential.includes('~')) {
    return 'sd-jwt-vc';
  }
  if (rawCredential.split('.').length === 3) {
    return 'jwt_vc_json';
  }
  return 'mso_mdoc';
}

function summarizeRawCredential(rawCredential: string): string {
  const compact = rawCredential.replace(/\s+/g, '');
  const dotParts = compact.split('.').length;
  const hasDisclosureSeparator = compact.includes('~');
  const preview = compact.slice(0, 80);

  return `len=${compact.length},dots=${dotParts},hasTilde=${hasDisclosureSeparator},preview=${preview}`;
}

function summarizeUnknownValue(value: unknown): string {
  if (Array.isArray(value)) {
    const first = value[0];
    const firstSummary =
      first && typeof first === 'object'
        ? `firstKeys=${Object.keys(first as Record<string, unknown>).slice(0, 8).join(',')}`
        : `firstType=${typeof first}`;
    return `Array(len=${value.length};${firstSummary})`;
  }

  if (value && typeof value === 'object') {
    return `Object(keys=${Object.keys(value as Record<string, unknown>).slice(0, 12).join(',')})`;
  }

  return `${typeof value}:${String(value)}`;
}

async function parseCredentialWithFallback(
  ctx: ProtocolContext,
  preferredFormat: CredentialFormatName,
  rawCredential: string
) {
  const attempted: Array<{ format: CredentialFormatName; error: unknown }> = [];

  const tryFormats: CredentialFormatName[] = [preferredFormat];
  const inferredFormat = inferFormatFromRawCredential(rawCredential);
  if (inferredFormat !== preferredFormat) {
    tryFormats.push(inferredFormat);
  }

  for (const formatName of tryFormats) {
    const handler = ctx.registry.getCredentialFormat(formatName);
    try {
      const parsedCredential = await handler.parse(rawCredential);
      return {
        handler,
        parsedCredential,
      };
    } catch (error) {
      attempted.push({ format: formatName, error });
    }
  }

  const detail = attempted
    .map(({ format, error }) => {
      const message = error instanceof Error ? error.message : String(error);
      return `${format}: ${message}`;
    })
    .join(' | ');

  throw new Error(
    `Unable to parse issued credential. attempted=${detail || '<none>'}; raw=${summarizeRawCredential(rawCredential)}`
  );
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

  const responsePayload = payload as IssuerCredentialResponse;
  if (
    typeof responsePayload.transaction_id === 'string' &&
    typeof responsePayload.acceptance_token !== 'string'
  ) {
    responsePayload.acceptance_token = options.accessToken;
  }

  return responsePayload;
}

function isDeferredCredentialResponse(
  credentialResponse: IssuerCredentialResponse
): boolean {
  return typeof credentialResponse.transaction_id === 'string';
}

function hasIssuedCredentialPayload(
  credentialResponse: IssuerCredentialResponse
): boolean {
  return (
    credentialResponse.credential !== undefined ||
    Array.isArray(credentialResponse.credentials)
  );
}

async function requestDeferredCredentialAttempt(options: {
  deferredCredentialEndpoint: string;
  acceptanceToken: string;
  transactionId: string;
}): Promise<{
  ok: boolean;
  status: number;
  payload: IssuerCredentialResponse;
}> {
  const response = await oid4vciCallbacks.fetch(
    normalizeIssuerContextUrl(options.deferredCredentialEndpoint),
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${options.acceptanceToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction_id: options.transactionId,
      }),
    }
  );

  const rawText = await response.text();
  let payload: unknown = null;
  try {
    payload = rawText ? (JSON.parse(rawText) as unknown) : null;
  } catch {
    payload = rawText;
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error(
      `Issuer returned an empty deferred credential response. status=${response.status}; endpoint=${options.deferredCredentialEndpoint}; body=${rawText || '<empty>'}`
    );
  }

  return {
    ok: response.ok,
    status: response.status,
    payload: payload as IssuerCredentialResponse,
  };
}

export async function resolveDeferredCredentialResponse(options: {
  credentialIssuer: string;
  issuerMetadata: unknown;
  credentialResponse: IssuerCredentialResponse;
  maxAttempts?: number;
}): Promise<IssuerCredentialResponse> {
  if (!isDeferredCredentialResponse(options.credentialResponse)) {
    return options.credentialResponse;
  }

  const issuerMetadataRecord =
    options.issuerMetadata && typeof options.issuerMetadata === 'object'
      ? (options.issuerMetadata as Record<string, unknown>)
      : undefined;
  const credentialIssuerMetadata =
    issuerMetadataRecord?.credentialIssuer &&
    typeof issuerMetadataRecord.credentialIssuer === 'object'
      ? (issuerMetadataRecord.credentialIssuer as Record<string, unknown>)
      : undefined;

  const deferredCredentialEndpoint =
    typeof credentialIssuerMetadata?.deferred_credential_endpoint === 'string'
      ? credentialIssuerMetadata.deferred_credential_endpoint
      : typeof credentialIssuerMetadata?.deferredCredentialEndpoint === 'string'
        ? credentialIssuerMetadata.deferredCredentialEndpoint
        : typeof issuerMetadataRecord?.deferred_credential_endpoint === 'string'
          ? issuerMetadataRecord.deferred_credential_endpoint
          : typeof issuerMetadataRecord?.deferredCredentialEndpoint === 'string'
            ? issuerMetadataRecord.deferredCredentialEndpoint
      : normalizeIssuerContextUrl(
          `${options.credentialIssuer.replace(/\/$/, '')}/wallet/deferredEndpoint`
        );

  const maxAttempts = options.maxAttempts ?? 10;
  let lastError =
    options.credentialResponse.error_description ??
    options.credentialResponse.error ??
    'Deferred credential is not ready yet.';
  let intervalMs = Math.max(1, options.credentialResponse.interval ?? 1) * 1000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      await sleep(intervalMs);
    }

    const { ok, status, payload } = await requestDeferredCredentialAttempt({
      deferredCredentialEndpoint,
      acceptanceToken: options.credentialResponse.acceptance_token!,
      transactionId: options.credentialResponse.transaction_id!,
    });

    if (ok && hasIssuedCredentialPayload(payload) && status < 300 && status !== 202) {
      return payload;
    }

    if (status === 202 || (ok && isDeferredCredentialResponse(payload))) {
      lastError = payload.error_description ?? payload.error ?? lastError;
      intervalMs = Math.max(1, payload.interval ?? intervalMs / 1000) * 1000;
      continue;
    }

    if (payload.error === 'authorization_pending') {
      lastError = payload.error_description ?? payload.error;
      intervalMs = Math.max(1, payload.interval ?? intervalMs / 1000) * 1000;
      continue;
    }

    if (payload.error === 'slow_down') {
      lastError = payload.error_description ?? payload.error;
      intervalMs = Math.max(intervalMs + 2000, Math.max(1, payload.interval ?? 1) * 1000);
      continue;
    }

    throw new Error(
      payload.error_description ??
        payload.error ??
        `Deferred credential request failed at issuer endpoint. status=${status}; endpoint=${deferredCredentialEndpoint}`
    );
  }

  throw new Error(
    `Deferred credential is still pending after ${maxAttempts} attempts. ${lastError}`
  );
}

function serializeCredentialValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object') {
    if ('credential' in (value as Record<string, unknown>)) {
      const nestedValue = (value as { credential?: unknown }).credential;
      return serializeCredentialValue(nestedValue);
    }

    if ('value' in (value as Record<string, unknown>)) {
      const nestedValue = (value as { value?: unknown }).value;
      return serializeCredentialValue(nestedValue);
    }

    if (Object.keys(value as Record<string, unknown>).length === 0) {
      return null;
    }

    return JSON.stringify(value);
  }

  return null;
}

export function extractRawCredential(credentialResponse: IssuerCredentialResponse): string {
  const topLevelCredential = serializeCredentialValue(credentialResponse.credential);
  if (topLevelCredential) {
    return topLevelCredential;
  }

  const first = credentialResponse.credentials?.[0];
  const firstCredential = serializeCredentialValue(first);
  if (firstCredential) {
    return firstCredential;
  }

  throw new Error(
    `Issuer response does not contain a supported credential payload. top=${summarizeUnknownValue(
      credentialResponse
    )}; credentials=${summarizeUnknownValue(credentialResponse.credentials)}`
  );
}

export async function toCredentialReceivedResult(
  ctx: ProtocolContext,
  credentialIssuer: string,
  credentialConfigurationId: string,
  issuerMetadata: unknown,
  credentialResponse: IssuerCredentialResponse,
  pendingDocumentKeyId?: string
): Promise<ProtocolResult> {
  const resolvedCredentialResponse = await resolveDeferredCredentialResponse({
    credentialIssuer,
    issuerMetadata,
    credentialResponse,
  });
  const rawCredential = extractRawCredential(resolvedCredentialResponse);
  const resolvedConfiguration = resolveCredentialConfiguration(
    credentialConfigurationId,
    issuerMetadata
  );
  const formatName =
    resolvedConfiguration.rawFormat
      ? toFormatName(resolvedConfiguration.rawFormat)
      : inferFormatFromRawCredential(rawCredential);
  const { handler, parsedCredential } = await parseCredentialWithFallback(
    ctx,
    formatName,
    rawCredential
  );
  const displayModel = handler.toDisplayModel(parsedCredential);
  displayModel._raw = rawCredential;
  displayModel._format = parsedCredential.format;

  if (pendingDocumentKeyId) {
    await finalizePendingMdocBinding(pendingDocumentKeyId, [displayModel]);
  }

  return { type: 'credential_received', credentials: [displayModel] };
}
