import type { CredentialOfferObject } from '@openid4vc/openid4vci';
import { INTEGRATION_CONFIG } from '@/config/integration';
import { normalizeIssuerOfferUri } from '@/wallet-core/transport/urlResolver';
import { oid4vciClient } from './client';

export function isOid4vciCallback(uri: string): boolean {
  return uri.startsWith(INTEGRATION_CONFIG.app.issuanceRedirectUri);
}

export async function resolveCredentialOffer(uri: string): Promise<CredentialOfferObject> {
  return oid4vciClient.resolveCredentialOffer(normalizeIssuerOfferUri(uri));
}

export function resolveCredentialConfigId(offer: CredentialOfferObject): string {
  const configuredEhic =
    INTEGRATION_CONFIG.credentials.ehic.credentialConfigurationId;
  const offered = offer.credential_configuration_ids ?? [];
  if (offered.includes(configuredEhic)) {
    return configuredEhic;
  }
  return offered[0] ?? configuredEhic;
}

export function resolveCredentialScope(
  credentialConfigurationId: string
): string | undefined {
  if (
    credentialConfigurationId ===
    INTEGRATION_CONFIG.credentials.ehic.credentialConfigurationId
  ) {
    return INTEGRATION_CONFIG.credentials.ehic.scope;
  }
  if (
    credentialConfigurationId ===
    INTEGRATION_CONFIG.credentials.pid.credentialConfigurationId
  ) {
    return INTEGRATION_CONFIG.credentials.pid.scope;
  }
  return undefined;
}
