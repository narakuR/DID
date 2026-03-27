import { INTEGRATION_CONFIG } from '@/config/integration';

function safeUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

function replaceOrigin(input: string, targetBaseUrl: string): string {
  const source = safeUrl(input);
  const target = safeUrl(targetBaseUrl);
  if (!source || !target) return input;
  source.protocol = target.protocol;
  source.host = target.host;
  return source.toString();
}

function rewriteObjectRecursively<T>(
  value: T,
  rewriteString: (input: string) => string
): T {
  if (typeof value === 'string') {
    return rewriteString(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => rewriteObjectRecursively(item, rewriteString)) as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, nested]) => [key, rewriteObjectRecursively(nested, rewriteString)]
    );
    return Object.fromEntries(entries) as T;
  }

  return value;
}

export function normalizeIssuerContextUrl(input: string): string {
  const parsed = safeUrl(input);
  if (!parsed) return input;

  const configuredIssuerHost = safeUrl(INTEGRATION_CONFIG.issuer.baseUrl)?.hostname;
  const configuredAuthHost = safeUrl(
    INTEGRATION_CONFIG.issuer.authorizationServerBaseUrl
  )?.hostname;
  const shouldRewriteHost =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '10.240.174.10' ||
    parsed.hostname === '10.0.2.2' ||
    parsed.hostname === INTEGRATION_CONFIG.app.localHostAlias ||
    parsed.hostname === configuredIssuerHost ||
    parsed.hostname === configuredAuthHost;

  if (!shouldRewriteHost) {
    return input;
  }

  if (parsed.pathname.startsWith('/idp')) {
    return replaceOrigin(input, INTEGRATION_CONFIG.issuer.authorizationServerBaseUrl);
  }

  return replaceOrigin(input, INTEGRATION_CONFIG.issuer.baseUrl);
}

export function normalizeVerifierContextUrl(input: string): string {
  const parsed = safeUrl(input);
  if (!parsed) return input;

  const configuredVerifierHost = safeUrl(INTEGRATION_CONFIG.verifier.baseUrl)?.hostname;
  const shouldRewriteHost =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '10.240.174.10' ||
    parsed.hostname === '10.0.2.2' ||
    parsed.hostname === INTEGRATION_CONFIG.app.localHostAlias ||
    parsed.hostname === configuredVerifierHost;

  if (!shouldRewriteHost) {
    return input;
  }

  return replaceOrigin(input, INTEGRATION_CONFIG.verifier.baseUrl);
}

export function normalizeIssuerOfferUri(input: string): string {
  return input;
}

export function normalizeIssuerPayload<T>(value: T): T {
  return rewriteObjectRecursively(value, normalizeIssuerContextUrl);
}

export function normalizeVerifierPayload<T>(value: T): T {
  return rewriteObjectRecursively(value, normalizeVerifierContextUrl);
}
