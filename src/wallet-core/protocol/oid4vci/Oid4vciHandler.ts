import type {
  IProtocolHandler,
  ProtocolContext,
  ProtocolResult,
} from '@/wallet-core/types/contracts';
import { oid4vciClient } from './client';
import {
  resolveCredentialOffer,
  resolveCredentialConfigId,
  isOid4vciCallback,
} from './offerResolver';
import {
  finishAuthorizationCodeFlow,
  startAuthorizationCodeFlow,
} from './authFlow';
import {
  requestCredentialWithIssuerCompat,
  toCredentialReceivedResult,
} from './credentialMapper';
import { buildCredentialRequestProof } from './proofBuilder';

export class Oid4vciHandler implements IProtocolHandler {
  readonly scheme = 'openid-credential-offer';

  canHandle(uri: string): boolean {
    return (
      isOid4vciCallback(uri) ||
      uri.startsWith('openid-credential-offer://') ||
      uri.startsWith('openid4vci://') ||
      uri.includes('credential_offer') ||
      uri.includes('credential_offer_uri')
    );
  }

  async handle(uri: string, ctx: ProtocolContext): Promise<ProtocolResult> {
    try {
      if (isOid4vciCallback(uri)) {
        return finishAuthorizationCodeFlow(uri, ctx, toCredentialReceivedResult);
      }

      const credentialOffer = await resolveCredentialOffer(uri);
      const issuerMetadata = await oid4vciClient.resolveIssuerMetadata(
        credentialOffer.credential_issuer
      );

      if (credentialOffer.grants?.authorization_code) {
        return startAuthorizationCodeFlow(credentialOffer);
      }

      const preAuthorizedCode =
        credentialOffer.grants?.[
          'urn:ietf:params:oauth:grant-type:pre-authorized_code'
        ]?.['pre-authorized_code'];

      if (!preAuthorizedCode) {
        return {
          type: 'error',
          message:
            'Issuer offer does not expose a supported grant. Expected authorization_code or pre-authorized_code.',
        };
      }

      const tokenResult =
        await oid4vciClient.retrievePreAuthorizedCodeAccessTokenFromOffer({
          credentialOffer,
          issuerMetadata,
        });

      const credentialConfigurationId = resolveCredentialConfigId(credentialOffer);
      const nonceResult = await oid4vciClient.requestNonce({ issuerMetadata });
      const proof = await buildCredentialRequestProof({
        issuerMetadata,
        credentialConfigurationId,
        nonce: nonceResult.c_nonce,
      });

      const credentialResponse = await requestCredentialWithIssuerCompat({
        accessToken: tokenResult.accessTokenResponse.access_token,
        credentialIssuer: credentialOffer.credential_issuer,
        credentialConfigurationId,
        proofJwt: proof.jwt,
      });

      return toCredentialReceivedResult(
        ctx,
        credentialConfigurationId,
        credentialResponse
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { type: 'error', message: `OID4VCI error: ${message}` };
    }
  }
}

export const oid4vciHandler = new Oid4vciHandler();
