declare module '@digitalcredentials/did-method-key' {
  export function createFromMultibase(options: {
    fromFingerprint: (options: { fingerprint: string }) => unknown;
  }): (options: { publicKeyMultibase: string }) => Promise<unknown>;

  export class DidKeyDriver {
    method: string;
    use(options: {
      multibaseMultikeyHeader: string;
      fromMultibase: (options: { publicKeyMultibase: string }) => Promise<unknown>;
    }): void;
    fromKeyPair(options: {
      verificationKeyPair: unknown;
      keyAgreementKeyPair?: unknown;
    }): Promise<{ didDocument: Record<string, unknown> }>;
    get(options: { did?: string; url?: string }): Promise<Record<string, unknown>>;
  }
}

declare module '@digitalbazaar/ed25519-verification-key-2020' {
  export class Ed25519VerificationKey2020 {
    publicKeyMultibase: string;
    privateKeyMultibase?: string;
    id?: string;
    controller?: string;
    type: string;
    _publicKeyBuffer: Uint8Array;

    static generate(options?: { seed?: Uint8Array }): Promise<Ed25519VerificationKey2020>;
    static from(options: {
      id?: string;
      controller?: string;
      type?: string;
      publicKeyMultibase: string;
      privateKeyMultibase?: string;
    }): Promise<Ed25519VerificationKey2020>;
    static fromFingerprint(options: { fingerprint: string }): Ed25519VerificationKey2020;

    fingerprint(): string;
    export(options: {
      publicKey?: boolean;
      privateKey?: boolean;
      includeContext?: boolean;
    }): Record<string, unknown>;
    signer(): { sign(options: { data: Uint8Array }): Promise<Uint8Array> };
    verifier(): { verify(options: { data: Uint8Array; signature: Uint8Array }): Promise<boolean> };
  }
}
