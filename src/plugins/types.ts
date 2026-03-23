import type { DIDDocument, DIDMetadata, VerifiableCredential } from '@/types';

// ── DID Provider ──────────────────────────────────────────────────────────────

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

/**
 * JwsSigner is the signing callback interface expected by oid4vc-ts.
 * The `sign` function receives the raw bytes to sign (the JWS signing input)
 * and returns the raw signature bytes.
 */
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
  /** Returns a signer compatible with the oid4vc-ts callback interface */
  asJwsSigner(keyId: string): JwsSigner;
}

// ── Credential Format ─────────────────────────────────────────────────────────

export type CredentialFormatName = 'sd-jwt-vc' | 'jwt_vc_json' | 'mso_mdoc';

export interface ParsedCredential {
  format: CredentialFormatName;
  raw: string;
  claims: Record<string, unknown>;
  issuerDid: string;
  issuanceDate?: string;
  expirationDate?: string;
  /** SD-JWT VC credential type identifier */
  vct?: string;
  /** mdoc document type */
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
  /**
   * SD-JWT only: rebuild presentation token exposing only the specified claim paths.
   * For other formats this is a no-op that returns the raw credential.
   */
  selectDisclose(raw: string, claimPaths: string[]): Promise<string>;
  toDisplayModel(parsed: ParsedCredential): VerifiableCredential;
}

// ── Protocol Handler ──────────────────────────────────────────────────────────

export interface ProtocolContext {
  registry: IPluginRegistry;
  credentials: VerifiableCredential[];
  activeDid: string;
}

/** Pending VP request — returned to the UI so the user can confirm before sending */
export interface PendingPresentationRequest {
  /** Human-readable verifier name (client_id or resolved name) */
  verifier: string;
  /** Matched credentials and the claim paths requested per credential */
  matches: Array<{
    credential: VerifiableCredential;
    /** Top-level claim paths that will be disclosed */
    disclosedClaims: string[];
    /** The query ID this credential satisfies */
    queryId: string;
  }>;
  /** Internal token so the protocol service can locate the stored state */
  presentationId: string;
}

export type ProtocolResult =
  | { type: 'credential_received'; credentials: VerifiableCredential[] }
  | { type: 'presentation_request'; request: PendingPresentationRequest }
  | { type: 'presentation_sent'; verifier: string; verificationResult?: Record<string, unknown> }
  | { type: 'redirect'; url: string }
  | { type: 'error'; message: string };

export interface IProtocolHandler {
  readonly scheme: string;
  canHandle(uri: string): boolean;
  handle(uri: string, ctx: ProtocolContext): Promise<ProtocolResult>;
}

// ── Storage Backend ───────────────────────────────────────────────────────────

export interface IStorageBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

// ── Plugin Registry Interface ─────────────────────────────────────────────────

export interface IPluginRegistry {
  registerDIDProvider(provider: IDIDProvider): void;
  registerCredentialFormat(format: ICredentialFormat): void;
  registerProtocolHandler(handler: IProtocolHandler): void;
  setStorageBackend(backend: IStorageBackend): void;
  getDIDProvider(method: string): IDIDProvider;
  getCredentialFormat(name: CredentialFormatName): ICredentialFormat;
  routeProtocol(uri: string): IProtocolHandler | null;
  get storage(): IStorageBackend;
}
