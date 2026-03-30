import { didJwkProvider } from '@/wallet-core/did/DidJwkProvider';
import { didKeyProvider } from '@/wallet-core/did/DidKeyProvider';
import type { JwsSigner, KeyReference } from '@/wallet-core/types/did';

export class SignerFactory {
  createJwsSigner(key: KeyReference): JwsSigner {
    if (key.method === 'did:jwk') {
      return didJwkProvider.asJwsSigner(key.keyId);
    }

    return didKeyProvider.asJwsSigner(key.keyId);
  }

  createRawSigner(key: KeyReference): (input: Uint8Array) => Promise<Uint8Array> {
    const signer = this.createJwsSigner(key);
    return signer.sign;
  }
}

export const signerFactory = new SignerFactory();
