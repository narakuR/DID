import { AuthorizationFlow, type CredentialOfferObject } from '@openid4vc/openid4vci';
import type {
  ProtocolContext,
  ProtocolResult,
} from '@/wallet-core/types/contracts';
import { storageService } from '@/services/storageService';
import { STORAGE_KEYS } from '@/constants/config';
import { INTEGRATION_CONFIG } from '@/config/integration';
import { oid4vciClient } from './client';
import { buildCredentialRequestProof } from './proofBuilder';
import { requestCredentialWithIssuerCompat } from './credentialMapper';
import {
  resolveCredentialConfigId,
  resolveCredentialScope,
} from './offerResolver';
import type { PendingOid4vciAuth } from './types';

async function savePendingAuthRequest(pending: PendingOid4vciAuth): Promise<void> {
  await storageService.setItem(STORAGE_KEYS.PENDING_OID4VCI_AUTH, pending);
}

export async function loadPendingAuthRequest(): Promise<PendingOid4vciAuth | null> {
  return storageService.getItem<PendingOid4vciAuth>(STORAGE_KEYS.PENDING_OID4VCI_AUTH);
}

export async function clearPendingAuthRequest(): Promise<void> {
  await storageService.removeItem(STORAGE_KEYS.PENDING_OID4VCI_AUTH);
}

export async function startAuthorizationCodeFlow(
  credentialOffer: CredentialOfferObject
): Promise<ProtocolResult> {
  const issuerMetadata = await oid4vciClient.resolveIssuerMetadata(
    credentialOffer.credential_issuer
  );
  const credentialConfigurationId = resolveCredentialConfigId(credentialOffer);
  const authorization = await oid4vciClient.initiateAuthorization({
    credentialOffer,
    issuerMetadata,
    clientId: INTEGRATION_CONFIG.issuer.clientId,
    redirectUri: INTEGRATION_CONFIG.app.issuanceRedirectUri,
    scope: resolveCredentialScope(credentialConfigurationId),
  });

  if (authorization.authorizationFlow !== AuthorizationFlow.Oauth2Redirect) {
    return {
      type: 'error',
      message:
        'Issuer requested presentation-during-issuance, which is not yet supported in this MVP.',
    };
  }

  await savePendingAuthRequest({
    credentialOffer,
    issuerMetadata,
    credentialConfigurationId,
    pkceCodeVerifier: authorization.pkce?.codeVerifier,
    redirectUri: INTEGRATION_CONFIG.app.issuanceRedirectUri,
  });

  return {
    type: 'redirect',
    url: authorization.authorizationRequestUrl,
  };
}

export async function finishAuthorizationCodeFlow(
  uri: string,
  ctx: ProtocolContext,
  toCredentialReceivedResult: (
    ctx: ProtocolContext,
    credentialConfigurationId: string,
    credentialResponse: Awaited<ReturnType<typeof requestCredentialWithIssuerCompat>>
  ) => Promise<ProtocolResult>
): Promise<ProtocolResult> {
  const pending = await loadPendingAuthRequest();
  if (!pending) {
    return {
      type: 'error',
      message: 'No pending authorization request found for OID4VCI callback.',
    };
  }

  const authorizationResponse =
    oid4vciClient.parseAndVerifyAuthorizationResponseRedirectUrl({
      url: uri,
      authorizationServerMetadata: pending.issuerMetadata.authorizationServers[0],
    });

  if (!('code' in authorizationResponse) || !authorizationResponse.code) {
    const errorMessage =
      'error_description' in authorizationResponse &&
      typeof authorizationResponse.error_description === 'string'
        ? authorizationResponse.error_description
        : 'error' in authorizationResponse &&
            typeof authorizationResponse.error === 'string'
          ? authorizationResponse.error
          : 'Authorization callback did not contain a code.';
    return {
      type: 'error',
      message: errorMessage,
    };
  }

  const tokenResult =
    await oid4vciClient.retrieveAuthorizationCodeAccessTokenFromOffer({
      issuerMetadata: pending.issuerMetadata,
      credentialOffer: pending.credentialOffer,
      authorizationCode: authorizationResponse.code,
      pkceCodeVerifier: pending.pkceCodeVerifier,
      redirectUri: pending.redirectUri,
    });

  const nonceResult = await oid4vciClient.requestNonce({
    issuerMetadata: pending.issuerMetadata,
  });
  const proof = await buildCredentialRequestProof({
    issuerMetadata: pending.issuerMetadata,
    credentialConfigurationId: pending.credentialConfigurationId,
    nonce: nonceResult.c_nonce,
  });

  const credentialResponse = await requestCredentialWithIssuerCompat({
    accessToken: tokenResult.accessTokenResponse.access_token,
    credentialIssuer: pending.credentialOffer.credential_issuer,
    credentialConfigurationId: pending.credentialConfigurationId,
    proofJwt: proof.jwt,
  });

  await clearPendingAuthRequest();
  return toCredentialReceivedResult(
    ctx,
    pending.credentialConfigurationId,
    credentialResponse
  );
}
