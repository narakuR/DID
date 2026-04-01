import type { DIDDocument } from '@/types';
import type {
  IDIDProvider,
  DIDCreateOptions,
  DIDProviderResult,
  JwsSigner,
} from '@/wallet-core/types/did';
import { resolveDidWebDocument } from '@/wallet-core/did/didWebAdapter';

export class DidWebProvider implements IDIDProvider {
  readonly method = 'did:web';

  async create(_options: DIDCreateOptions = {}): Promise<DIDProviderResult> {
    throw new Error('did:web does not support local key generation');
  }

  async resolve(did: string): Promise<DIDDocument> {
    return resolveDidWebDocument(did, new Date().toISOString());
  }

  async sign(_payload: Uint8Array, _keyId: string): Promise<Uint8Array> {
    throw new Error('did:web signing is not supported by the wallet');
  }

  async verify(payload: Uint8Array, sig: Uint8Array, did: string): Promise<boolean> {
    try {
      const doc = await this.resolve(did);
      const vm = doc.verificationMethod[0];
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
}

function base64UrlToBytes(value: string): Uint8Array {
  const { Buffer } = require('buffer') as typeof import('buffer');
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const normalized = padded + '='.repeat((4 - (padded.length % 4 || 4)) % 4);
  return Uint8Array.from(Buffer.from(normalized, 'base64'));
}

export const didWebProvider = new DidWebProvider();
