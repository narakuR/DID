import * as SecureStore from 'expo-secure-store';
import * as ExpoCrypto from 'expo-crypto';
import { p256 } from '@noble/curves/nist.js';

import { storageService } from '@/services/storageService';
import { SECURE_STORE_KEYS } from '@/constants/config';
import type { DIDDocument, DIDMetadata } from '@/types';
import type {
  IDIDProvider,
  DIDCreateOptions,
  DIDProviderResult,
  JwsSigner,
} from '@/wallet-core/types/did';
import {
  base64UrlToBytes,
  bytesToBase64Url,
  createDidJwkDocument,
  privateSeedToP256Jwk,
  publicKeyBytesFromPublicJwk,
  resolveDidJwkDocument,
} from '@/wallet-core/did/didJwkAdapter';

const STORAGE_KEY_JWK_META = 'did_jwk_metadata';
const SECURE_KEY_JWK = `${SECURE_STORE_KEYS.DID_PRIVATE_KEY_PREFIX}jwk_p256`;

export class DidJwkProvider implements IDIDProvider {
  readonly method = 'did:jwk';

  async create(_options: DIDCreateOptions = {}): Promise<DIDProviderResult> {
    const seed = ExpoCrypto.getRandomBytes(32);
    const createdAt = new Date().toISOString();
    const { did, keyId, publicKeyBytes, didDocument } = createDidJwkDocument({
      seed,
      createdAt,
    });

    await SecureStore.setItemAsync(SECURE_KEY_JWK, bytesToBase64Url(seed), {
      requireAuthentication: true,
      authenticationPrompt: '请验证身份以访问 DID JWK 私钥',
    });

    const metadata: DIDMetadata = {
      did,
      method: 'did:jwk',
      algorithm: 'P-256',
      keyId,
      publicKeyMultibase: '',
      registeredAt: createdAt,
      status: 'active',
    };

    await storageService.setItem(STORAGE_KEY_JWK_META, metadata);

    return { did, keyId, publicKeyBytes, metadata, didDocument };
  }

  async resolve(did: string): Promise<DIDDocument> {
    return resolveDidJwkDocument(did, new Date().toISOString());
  }

  async sign(payload: Uint8Array, _keyId: string): Promise<Uint8Array> {
    const stored = await SecureStore.getItemAsync(SECURE_KEY_JWK, {
      requireAuthentication: true,
      authenticationPrompt: '请验证身份以使用 DID JWK 私钥签名',
    });
    if (!stored) throw new Error('DID JWK 私钥不存在');

    const seed = base64UrlToBytes(stored);
    return p256.sign(payload, seed, { lowS: true });
  }

  async verify(payload: Uint8Array, sig: Uint8Array, did: string): Promise<boolean> {
    try {
      const doc = await this.resolve(did);
      const pubKeyBytes = publicKeyBytesFromPublicJwk(
        doc.verificationMethod[0].publicKeyJwk as {
          kty: 'EC';
          crv: 'P-256';
          x: string;
          y: string;
        }
      );
      return p256.verify(sig, payload, pubKeyBytes);
    } catch {
      return false;
    }
  }

  asJwsSigner(keyId: string): JwsSigner {
    return {
      alg: 'ES256',
      sign: (input: Uint8Array) => this.sign(input, keyId),
    };
  }

  async getStoredMetadata(): Promise<DIDMetadata | null> {
    return storageService.getItem<DIDMetadata>(STORAGE_KEY_JWK_META);
  }

  async exportPrivateJwk(): Promise<{
    kty: string; crv: string; x: string; y: string; d: string;
  }> {
    const stored = await SecureStore.getItemAsync(SECURE_KEY_JWK, {
      requireAuthentication: true,
      authenticationPrompt: '请验证身份以访问 DID JWK 私钥',
    });
    if (!stored) throw new Error('DID JWK 私钥不存在');
    return privateSeedToP256Jwk(base64UrlToBytes(stored));
  }
}

export const didJwkProvider = new DidJwkProvider();
