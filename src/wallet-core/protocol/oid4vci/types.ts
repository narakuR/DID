import type {
  CredentialOfferObject,
  IssuerMetadataResult,
} from '@openid4vc/openid4vci';

export type PendingOid4vciAuth = {
  credentialOffer: CredentialOfferObject;
  issuerMetadata: IssuerMetadataResult;
  credentialConfigurationId: string;
  pkceCodeVerifier?: string;
  redirectUri: string;
};

export type IssuerCredentialResponse = {
  credential?: unknown;
  credentials?: ({ credential?: unknown } | unknown)[];
};
