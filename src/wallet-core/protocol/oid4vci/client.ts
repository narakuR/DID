import { Openid4vciClient } from '@openid4vc/openid4vci';
import { INTEGRATION_CONFIG } from '@/config/integration';
import { buildOid4vcCallbacks } from '@/wallet-core/utils/oid4vcCallbacks';
import { normalizeIssuerContextUrl } from '@/wallet-core/transport/urlResolver';

export const oid4vciCallbacks = {
  ...buildOid4vcCallbacks(INTEGRATION_CONFIG.issuer.clientId),
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    const rewritten =
      typeof input === 'string'
        ? normalizeIssuerContextUrl(input)
        : input instanceof URL
          ? new URL(normalizeIssuerContextUrl(input.toString()))
          : normalizeIssuerContextUrl(input.url);

    if (typeof input === 'string' || input instanceof URL) {
      return fetch(rewritten, init);
    }

    return fetch(rewritten, {
      ...init,
      method: input.method,
      headers: init?.headers ?? input.headers,
      body: init?.body,
    });
  },
};

export const oid4vciClient = new Openid4vciClient({ callbacks: oid4vciCallbacks });
