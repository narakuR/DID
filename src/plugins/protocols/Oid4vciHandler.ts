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

// ── Oid4vciHandler ────────────────────────────────────────────────────────────

/**
 * OID4VCI protocol handler.
 * Handles `openid-credential-offer://` and `openid4vci://` deep links.
 *
 * Pre-authorized code flow executes fully inline.
 * Authorization code flow returns a `redirect` result — the caller must open
 * the URL in expo-web-browser and resume via handleAuthCodeCallback().
 */
export class Oid4vciHandler implements IProtocolHandler {
  readonly scheme = 'openid-credential-offer';

  canHandle(uri: string): boolean {
    return (
      uri.startsWith('openid-credential-offer://') ||
      uri.startsWith('openid4vci://') ||
      uri.includes('credential_offer') ||
      uri.includes('credential_offer_uri')
    );
  }

  async handle(uri: string, ctx: ProtocolContext): Promise<ProtocolResult> {
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
          return {
            type: 'redirect',
            url: (authResult as { authorizationRequestUrl: string }).authorizationRequestUrl,
          };
        }
        return { type: 'error', message: 'Authorization flow not supported in this version' };
      }

      // 4. Retrieve access token (pre-auth flow)
      const { accessTokenResponse } = await client.retrievePreAuthorizedCodeAccessTokenFromOffer({
        credentialOffer: offer,
        issuerMetadata,
        // txCode: undefined — if required, caller must inject via context
      });

      const accessToken = accessTokenResponse.access_token;

      // 5. Retrieve each offered credential
      const credentialConfigIds = offer.credential_configuration_ids ?? [];
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
        const parsed = await formatHandler.parse(raw);
        receivedCredentials.push(formatHandler.toDisplayModel(parsed));
      }

      return { type: 'credential_received', credentials: receivedCredentials };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { type: 'error', message: `OID4VCI error: ${message}` };
    }
  }
}

export const oid4vciHandler = new Oid4vciHandler();
