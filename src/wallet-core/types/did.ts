import type { DIDDocument, DIDMetadata } from '@/types';

export interface DIDCreateOptions {
  algorithm?: 'Ed25519' | 'P-256';
}

export interface DIDProviderResult {
  did: string;
  keyId: string;
  publicKeyBytes: Uint8Array;
  metadata: DIDMetadata;
  didDocument: DIDDocument;
}

export interface JwsSigner {
  alg: string;
  sign(input: Uint8Array): Promise<Uint8Array>;
}

export interface IDIDProvider {
  readonly method: string;
  create(options?: DIDCreateOptions): Promise<DIDProviderResult>;
  resolve(did: string): Promise<DIDDocument>;
  sign(payload: Uint8Array, keyId: string): Promise<Uint8Array>;
  verify(payload: Uint8Array, sig: Uint8Array, did: string): Promise<boolean>;
  asJwsSigner(keyId: string): JwsSigner;
}
