import type { VerifiableCredential } from '@/types';

export type CredentialFormatName = 'sd-jwt-vc' | 'jwt_vc_json' | 'mso_mdoc';

export interface ParsedCredential {
  format: CredentialFormatName;
  raw: string;
  claims: Record<string, unknown>;
  issuerDid: string;
  issuanceDate?: string;
  expirationDate?: string;
  vct?: string;
  docType?: string;
}

export interface VerifyResult {
  valid: boolean;
  error?: string;
}

export interface ICredentialFormat {
  readonly name: CredentialFormatName;
  parse(raw: string): Promise<ParsedCredential>;
  verify(raw: string): Promise<VerifyResult>;
  selectDisclose(raw: string, claimPaths: string[]): Promise<string>;
  toDisplayModel(parsed: ParsedCredential): VerifiableCredential;
}
