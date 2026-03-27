import type { VerifiableCredential } from '@/types';

export interface RequestObject {
  client_id?: string;
  response_uri?: string;
  redirect_uri?: string;
  response_mode?: string;
  request_uri_method?: string;
  state?: string;
  nonce?: string;
  client_metadata?: Record<string, unknown>;
  dcql_query?: {
    credentials?: {
      id?: string;
      format?: string;
      meta?: { type?: string; vct_values?: string[] };
      claims?: { path?: string[] }[];
    }[];
  };
}

export type DcqlCredentialQuery = NonNullable<
  NonNullable<RequestObject['dcql_query']>['credentials']
>[number];

export type DcqlClaim = NonNullable<DcqlCredentialQuery['claims']>[number];

export interface StoredPresentationRequest {
  requestObject: RequestObject;
  matched: {
    credential: VerifiableCredential;
    disclosedClaims: string[];
    queryId: string;
  }[];
  verifier: string;
}
