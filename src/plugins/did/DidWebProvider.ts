import type { DIDDocument } from '@/types';
import type { IDIDProvider, DIDCreateOptions, DIDProviderResult, JwsSigner } from '../types';

/**
 * DID provider for the `did:web` method.
 *
 * Resolution fetches `/.well-known/did.json` (or `/path/did.json` for sub-paths)
 * from the corresponding HTTPS host. No key generation — `did:web` DIDs are
 * controlled by the server that publishes the DID document.
 *
 * `sign()` and `create()` are intentionally unsupported because this provider
 * is used only for *verifying* third-party `did:web` identifiers (e.g. issuers,
 * verifiers). Wallet holders use `did:key` or `did:jwk`.
 */
export class DidWebProvider implements IDIDProvider {
  readonly method = 'did:web';

  async create(_options: DIDCreateOptions = {}): Promise<DIDProviderResult> {
    throw new Error('did:web does not support local key generation');
  }

  async resolve(did: string): Promise<DIDDocument> {
    const url = this._didToUrl(did);
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Failed to fetch did:web document from ${url}: ${resp.status}`);
    }
    const doc = (await resp.json()) as DIDDocument;
    if (!doc.id || !doc.verificationMethod) {
      throw new Error(`Invalid DID document at ${url}`);
    }
    return doc;
  }

  async sign(_payload: Uint8Array, _keyId: string): Promise<Uint8Array> {
    throw new Error('did:web signing is not supported by the wallet');
  }

  async verify(payload: Uint8Array, sig: Uint8Array, did: string): Promise<boolean> {
    try {
      // Resolve the DID document and extract the public key
      const doc = await this.resolve(did);
      const vm = doc.verificationMethod[0];

      // Only handles Ed25519 and P-256 via JsonWebKey2020 for now
      const jwk = vm.publicKeyJwk as Record<string, string> | undefined;
      if (!jwk) return false;

      if (jwk.crv === 'Ed25519') {
        const { ed25519 } = await import('@noble/curves/ed25519.js');
        const pubBytes = base64UrlToBytes(jwk.x);
        return ed25519.verify(sig, payload, pubBytes);
      }

      if (jwk.crv === 'P-256') {
        const { p256 } = await import('@noble/curves/nist.js');
        const xBytes = base64UrlToBytes(jwk.x);
        const yBytes = base64UrlToBytes(jwk.y ?? '');
        const pubBytes = new Uint8Array([0x04, ...xBytes, ...yBytes]);
        return p256.verify(sig, payload, pubBytes);
      }

      return false;
    } catch {
      return false;
    }
  }

  asJwsSigner(_keyId: string): JwsSigner {
    throw new Error('did:web signing is not supported by the wallet');
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _didToUrl(did: string): string {
    // did:web:example.com        → https://example.com/.well-known/did.json
    // did:web:example.com:users:alice → https://example.com/users/alice/did.json
    const suffix = did.replace('did:web:', '');
    const [host, ...pathParts] = suffix.split(':');
    const decodedHost = decodeURIComponent(host);
    if (pathParts.length === 0) {
      return `https://${decodedHost}/.well-known/did.json`;
    }
    const path = pathParts.map(decodeURIComponent).join('/');
    return `https://${decodedHost}/${path}/did.json`;
  }
}

// ── Encoding helper (local, avoids circular dep with jwtUtils) ────────────────

function base64UrlToBytes(value: string): Uint8Array {
  const { Buffer } = require('buffer') as typeof import('buffer');
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const normalized = padded + '='.repeat((4 - (padded.length % 4 || 4)) % 4);
  return Uint8Array.from(Buffer.from(normalized, 'base64'));
}

export const didWebProvider = new DidWebProvider();
