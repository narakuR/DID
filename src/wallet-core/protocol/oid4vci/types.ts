import type {
  CredentialOfferObject,
  IssuerMetadataResult,
} from '@openid4vc/openid4vci';
import type { CredentialFormatName } from '@/wallet-core/types/credential';

export type PendingOid4vciAuth = {
  credentialOffer: CredentialOfferObject;
  issuerMetadata: IssuerMetadataResult;
  credentialConfigurationId: string;
  pkceCodeVerifier?: string;
  redirectUri: string;
  pendingDocumentKeyId?: string;
};

export type IssuerCredentialResponse = {
  credential?: unknown;
  credentials?: ({ credential?: unknown } | unknown)[];
  transaction_id?: string;
  acceptance_token?: string;
  interval?: number;
  c_nonce?: string;
  c_nonce_expires_in?: number;
  error?: string;
  error_description?: string;
};

export type IssuerCredentialConfiguration = {
  id?: string;
  format?: string;
  scope?: string;
  vct?: string;
  docType?: string;
  doctype?: string;
  claims?: unknown;
  cryptographic_binding_methods_supported?: string[];
  proof_types_supported?: Record<
    string,
    {
      proof_signing_alg_values_supported?: string[];
    }
  >;
  display?: Array<{
    name?: string;
    locale?: string;
  }>;
};

export type IssuerCredentialConfigurationMap = Record<
  string,
  IssuerCredentialConfiguration
>;

export type ResolvedCredentialConfiguration = {
  id: string;
  format: CredentialFormatName;
  rawFormat?: string;
  scope?: string;
  vct?: string;
  displayName: string;
  source?: 'openid-credential-issuer' | 'jwt-vc-issuer';
  bindingMethodsSupported?: string[];
  proofSigningAlgValuesSupported?: string[];
};
