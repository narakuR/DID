import type { CredentialOfferObject } from '@openid4vc/openid4vci';
import { INTEGRATION_CONFIG } from '@/config/integration';
import { fetchJson } from '@/wallet-core/transport/httpClient';
import {
  normalizeIssuerContextUrl,
  normalizeIssuerOfferUri,
} from '@/wallet-core/transport/urlResolver';
import type { CredentialFormatName } from '@/wallet-core/types/credential';
import { oid4vciClient } from './client';
import type {
  IssuerCredentialConfiguration,
  IssuerCredentialConfigurationMap,
  ResolvedCredentialConfiguration,
} from './types';

export function isOid4vciCallback(uri: string): boolean {
  return uri.startsWith(INTEGRATION_CONFIG.app.issuanceRedirectUri);
}

export async function resolveCredentialOffer(uri: string): Promise<CredentialOfferObject> {
  return oid4vciClient.resolveCredentialOffer(normalizeIssuerOfferUri(uri));
}

function uniqById(
  configurations: ResolvedCredentialConfiguration[]
): ResolvedCredentialConfiguration[] {
  return Array.from(
    new Map(configurations.map((configuration) => [configuration.id, configuration])).values()
  );
}

function getMetadataConfigurations(
  issuerMetadata?: unknown
): IssuerCredentialConfigurationMap {
  if (!issuerMetadata || typeof issuerMetadata !== 'object') {
    return {};
  }

  const metadata = issuerMetadata as {
    credential_configurations_supported?: unknown;
    credentialConfigurationsSupported?: unknown;
    credentials_supported?: unknown;
    credentialsSupported?: unknown;
    knownCredentialConfigurations?: unknown;
    known_credential_configurations?: unknown;
    signedCredentials?: unknown;
  };

  const signedCredentials =
    metadata.signedCredentials && typeof metadata.signedCredentials === 'object'
      ? (metadata.signedCredentials as Record<string, unknown>)
      : undefined;

  const supported =
    metadata.credential_configurations_supported ??
    metadata.credentialConfigurationsSupported ??
    metadata.credentials_supported ??
    metadata.credentialsSupported ??
    metadata.knownCredentialConfigurations ??
    metadata.known_credential_configurations ??
    signedCredentials?.credential_configurations_supported ??
    signedCredentials?.credentialConfigurationsSupported ??
    signedCredentials?.credentials_supported ??
    signedCredentials?.credentialsSupported ??
    signedCredentials?.knownCredentialConfigurations ??
    signedCredentials?.known_credential_configurations;

  if (Array.isArray(supported)) {
    const entries = supported
      .map((item, index) => {
        if (!item || typeof item !== 'object') {
          return null;
        }
        const configuration = item as IssuerCredentialConfiguration;
        const id =
          configuration.id ??
          (typeof configuration.docType === 'string'
            ? configuration.docType
            : typeof configuration.doctype === 'string'
              ? configuration.doctype
              : typeof configuration.vct === 'string'
                ? configuration.vct
                : `credential-${index}`);
        return [id, configuration] as const;
      })
      .filter((entry): entry is readonly [string, IssuerCredentialConfiguration] => !!entry);

    return Object.fromEntries(entries);
  }

  if (!supported || typeof supported !== 'object') {
    return {};
  }

  return supported as IssuerCredentialConfigurationMap;
}

export function resolveCredentialConfigId(
  offer: CredentialOfferObject,
  issuerMetadata?: unknown
): string {
  const configuredEhic =
    INTEGRATION_CONFIG.credentials.ehic.credentialConfigurationId;
  const offered = offer.credential_configuration_ids ?? [];
  if (offered.includes(configuredEhic)) {
    return configuredEhic;
  }
  const metadataConfigurations = getMetadataConfigurations(issuerMetadata);
  for (const credentialConfigurationId of offered) {
    if (metadataConfigurations[credentialConfigurationId]) {
      return credentialConfigurationId;
    }
  }
  return offered[0] ?? configuredEhic;
}

function toFormatName(rawFormat?: string): CredentialFormatName {
  if (rawFormat === 'dc+sd-jwt' || rawFormat === 'vc+sd-jwt') {
    return 'sd-jwt-vc';
  }
  if (rawFormat === 'mso_mdoc') {
    return 'mso_mdoc';
  }
  if (rawFormat === 'jwt_vc_json' || rawFormat === 'jwt_vc') {
    return 'jwt_vc_json';
  }
  return 'jwt_vc_json';
}

export function getCredentialConfiguration(
  credentialConfigurationId: string,
  issuerMetadata?: unknown
): IssuerCredentialConfiguration | undefined {
  return getMetadataConfigurations(issuerMetadata)[credentialConfigurationId];
}

export function resolveCredentialScope(
  credentialConfigurationId: string,
  issuerMetadata?: unknown
): string | undefined {
  const configuration = getCredentialConfiguration(
    credentialConfigurationId,
    issuerMetadata
  );
  if (typeof configuration?.scope === 'string') {
    return configuration.scope;
  }

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

function inferDisplayName(
  credentialConfigurationId: string,
  configuration?: IssuerCredentialConfiguration
): string {
  const displayName = configuration?.display?.find((item) => item?.name)?.name;
  if (displayName) {
    return displayName;
  }
  return credentialConfigurationId;
}

export function resolveCredentialConfiguration(
  credentialConfigurationId: string,
  issuerMetadata?: unknown,
  source: ResolvedCredentialConfiguration['source'] = 'openid-credential-issuer'
): ResolvedCredentialConfiguration {
  const configuration = getCredentialConfiguration(
    credentialConfigurationId,
    issuerMetadata
  );
  const rawFormat = typeof configuration?.format === 'string'
    ? configuration.format
    : undefined;
  const proofTypes = configuration?.proof_types_supported;
  const jwtProofType =
    proofTypes && typeof proofTypes === 'object' ? proofTypes.jwt : undefined;

  return {
    id: credentialConfigurationId,
    format: toFormatName(rawFormat),
    rawFormat,
    vct: configuration?.vct,
    scope: resolveCredentialScope(credentialConfigurationId, issuerMetadata),
    displayName: inferDisplayName(credentialConfigurationId, configuration),
    source,
    bindingMethodsSupported:
      configuration?.cryptographic_binding_methods_supported,
    proofSigningAlgValuesSupported:
      jwtProofType?.proof_signing_alg_values_supported,
  };
}

export function listIssuerCredentialConfigurations(
  issuerMetadata?: unknown
): ResolvedCredentialConfiguration[] {
  return Object.entries(getMetadataConfigurations(issuerMetadata)).map(
    ([credentialConfigurationId]) =>
      resolveCredentialConfiguration(
        credentialConfigurationId,
        issuerMetadata,
        'openid-credential-issuer'
      )
  );
}

function deriveJwtVcIssuerMetadataUrl(issuerBaseUrl: string): string {
  const parsed = new URL(issuerBaseUrl);
  return `${parsed.origin}/.well-known/jwt-vc-issuer${parsed.pathname}`;
}

type JwtVcIssuerMetadata = {
  credential_configurations_supported?: unknown;
  credentialConfigurationsSupported?: unknown;
  credentials_supported?: unknown;
  credentialsSupported?: unknown;
  type_metadata?: unknown;
  typeMetadata?: unknown;
  types_supported?: unknown;
  typesSupported?: unknown;
  vcts_supported?: unknown;
  vctsSupported?: unknown;
};

function listJwtVcIssuerConfigurations(
  metadata?: JwtVcIssuerMetadata
): ResolvedCredentialConfiguration[] {
  if (!metadata || typeof metadata !== 'object') {
    return [];
  }

  const standardConfigurations = listIssuerCredentialConfigurations(metadata);
  if (standardConfigurations.length > 0) {
    return standardConfigurations.map((configuration) => ({
      ...configuration,
      source: 'jwt-vc-issuer',
    }));
  }

  const entries: ResolvedCredentialConfiguration[] = [];

  const recordSource = metadata.type_metadata ?? metadata.typeMetadata;
  if (recordSource && typeof recordSource === 'object' && !Array.isArray(recordSource)) {
    for (const [vct, value] of Object.entries(recordSource as Record<string, unknown>)) {
      const configuration = value as IssuerCredentialConfiguration | undefined;
      entries.push({
        id: vct,
        vct,
        format: toFormatName(configuration?.format ?? 'dc+sd-jwt'),
        rawFormat: configuration?.format ?? 'dc+sd-jwt',
        scope: configuration?.scope,
        displayName: inferDisplayName(vct, configuration),
        source: 'jwt-vc-issuer',
        bindingMethodsSupported:
          configuration?.cryptographic_binding_methods_supported,
        proofSigningAlgValuesSupported:
          configuration?.proof_types_supported?.jwt?.proof_signing_alg_values_supported,
      });
    }
  }

  const typesSource =
    metadata.types_supported ??
    metadata.typesSupported ??
    metadata.vcts_supported ??
    metadata.vctsSupported;

  if (Array.isArray(typesSource)) {
    for (const item of typesSource) {
      if (typeof item === 'string') {
        entries.push({
          id: item,
          vct: item,
          format: 'sd-jwt-vc',
          rawFormat: 'dc+sd-jwt',
          displayName: item,
          source: 'jwt-vc-issuer',
        });
        continue;
      }

      if (item && typeof item === 'object') {
        const configuration = item as IssuerCredentialConfiguration;
        const id =
          configuration.id ??
          configuration.vct ??
          configuration.docType ??
          configuration.doctype;
        if (!id) continue;
        entries.push({
          id,
          vct: configuration.vct,
          format: toFormatName(configuration.format ?? 'dc+sd-jwt'),
          rawFormat: configuration.format ?? 'dc+sd-jwt',
          scope: configuration.scope,
          displayName: inferDisplayName(id, configuration),
          source: 'jwt-vc-issuer',
          bindingMethodsSupported:
            configuration.cryptographic_binding_methods_supported,
          proofSigningAlgValuesSupported:
            configuration.proof_types_supported?.jwt?.proof_signing_alg_values_supported,
        });
      }
    }
  }

  return uniqById(entries);
}

export async function listAvailableIssuerCredentialConfigurations(
  issuerBaseUrl: string,
  issuerMetadata?: unknown
): Promise<ResolvedCredentialConfiguration[]> {
  const standardConfigurations = listIssuerCredentialConfigurations(issuerMetadata);
  if (standardConfigurations.length > 0) {
    return standardConfigurations;
  }

  try {
    const jwtVcIssuerMetadata = await fetchJson<JwtVcIssuerMetadata>(
      deriveJwtVcIssuerMetadataUrl(issuerBaseUrl),
      {
        rewriteUrl: normalizeIssuerContextUrl,
      }
    );
    return listJwtVcIssuerConfigurations(jwtVcIssuerMetadata);
  } catch {
    return [];
  }
}
