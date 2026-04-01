import '@/polyfills/crypto';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as ExpoCrypto from 'expo-crypto';
import { ed25519 } from '@noble/curves/ed25519.js';
import { Buffer } from 'buffer';

import { storageService } from '@/services/storageService';
import { SECURE_STORE_KEYS, STORAGE_KEYS } from '@/constants/config';
import type { DIDDocument, DIDMetadata } from '@/types';
import type {
  IDIDProvider,
  DIDCreateOptions,
  DIDProviderResult,
  JwsSigner,
} from '@/wallet-core/types/did';
import {
  createDidKeyDocument,
  resolveDidKeyDocument,
  verifyDidKeySignature,
} from '@/wallet-core/did/didKeyAdapter';

function bytesToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const normalized = padded + '='.repeat((4 - (padded.length % 4 || 4)) % 4);
  return Uint8Array.from(Buffer.from(normalized, 'base64'));
}

export class DidKeyProvider implements IDIDProvider {
  readonly method = 'did:key';

  async create(_options: DIDCreateOptions = {}): Promise<DIDProviderResult> {
    const seed = ExpoCrypto.getRandomBytes(32);
    const createdAt = new Date().toISOString();
    const { did, keyId, publicKeyBytes, publicKeyMultibase, didDocument } =
      await createDidKeyDocument({
        seed,
        createdAt,
      });

    await SecureStore.setItemAsync(this._secureKey(keyId), bytesToBase64Url(seed), {
      requireAuthentication: true,
      authenticationPrompt: '请验证身份以访问 DID 私钥',
    });

    const metadata: DIDMetadata = {
      did,
      method: 'did:key',
      algorithm: 'Ed25519',
      keyId,
      publicKeyMultibase,
      registeredAt: createdAt,
      status: 'active',
    };

    await storageService.setItem(STORAGE_KEYS.DID_METADATA, metadata);
    await storageService.setItem(STORAGE_KEYS.DID_DOCUMENT, didDocument);

    return { did, keyId, publicKeyBytes, metadata, didDocument };
  }

  async resolve(did: string): Promise<DIDDocument> {
    const stored = await storageService.getItem<DIDDocument>(STORAGE_KEYS.DID_DOCUMENT);
    if (stored && stored.id === did) return stored;

    const storedMeta = await storageService.getItem<DIDMetadata>(STORAGE_KEYS.DID_METADATA);
    if (storedMeta && storedMeta.did === did) {
      return resolveDidKeyDocument(storedMeta.did, storedMeta.registeredAt);
    }

    return resolveDidKeyDocument(did, new Date().toISOString());
  }

  async sign(payload: Uint8Array, keyId: string): Promise<Uint8Array> {
    const stored = await SecureStore.getItemAsync(this._secureKey(keyId), {
      requireAuthentication: true,
      authenticationPrompt: '请验证身份以使用 DID 私钥签名',
    });
    if (!stored) throw new Error('DID 私钥不存在');

    const storedBytes = base64UrlToBytes(stored);
    const seed = storedBytes.length === 64 ? storedBytes.slice(0, 32) : storedBytes;
    return ed25519.sign(payload, seed);
  }

  async verify(payload: Uint8Array, sig: Uint8Array, did: string): Promise<boolean> {
    try {
      const doc = await this.resolve(did);
      const vm = doc.verificationMethod[0];
      return verifyDidKeySignature({
        payload,
        signature: sig,
        publicKeyMultibase: vm.publicKeyMultibase,
      });
    } catch {
      return false;
    }
  }

  asJwsSigner(keyId: string): JwsSigner {
    return {
      alg: 'EdDSA',
      sign: (input: Uint8Array) => this.sign(input, keyId),
    };
  }

  async getStoredMetadata(): Promise<DIDMetadata | null> {
    return storageService.getItem<DIDMetadata>(STORAGE_KEYS.DID_METADATA);
  }

  async getStoredDocument(): Promise<DIDDocument | null> {
    return storageService.getItem<DIDDocument>(STORAGE_KEYS.DID_DOCUMENT);
  }

  async exportDocumentToDevice(): Promise<string> {
    const didDocument = await this.getStoredDocument();
    if (!didDocument) throw new Error('DID 文档不存在，请先生成 DID 密钥对。');

    const cacheDirectory = FileSystem.cacheDirectory;
    if (!cacheDirectory) throw new Error('当前设备不可用文件缓存目录。');

    const filename = `${didDocument.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    const fileUri = `${cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(didDocument, null, 2), {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const sharingAvailable = await Sharing.isAvailableAsync();
    if (sharingAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: '导出 DID 公钥文档',
        UTI: 'public.json',
      });
    }
    return fileUri;
  }

  getPrivateKeyLocationHint(keyId: string): { storeKey: string; location: string } {
    return {
      storeKey: this._secureKey(keyId),
      location:
        '私钥保存在系统安全存储中：iOS 为 Keychain，Android 为 Keystore/Encrypted SharedPreferences，由 expo-secure-store 管理。',
    };
  }

  async getStoredPrivateKeyValue(keyId: string): Promise<string | null> {
    return SecureStore.getItemAsync(this._secureKey(keyId), {
      requireAuthentication: true,
      authenticationPrompt: '请验证身份以查看 DID 私钥',
    });
  }

  private _secureKey(keyId: string): string {
    const encodedKeyId = bytesToBase64Url(Buffer.from(keyId, 'utf8'));
    return `${SECURE_STORE_KEYS.DID_PRIVATE_KEY_PREFIX}${encodedKeyId}`;
  }
}

export const didKeyProvider = new DidKeyProvider();
