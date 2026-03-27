import type { CredentialFormatName } from './credential';

export interface WalletProfile {
  id: string;
  protocols: Array<'oid4vci' | 'oid4vp'>;
  formats: CredentialFormatName[];
  responseModes?: string[];
  requestObjectModes?: Array<'by_reference' | 'by_value'>;
  metadata?: Record<string, unknown>;
}
