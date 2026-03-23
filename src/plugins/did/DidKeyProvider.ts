import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as ExpoCrypto from 'expo-crypto';
import { ed25519 } from '@noble/curves/ed25519.js';
import { Buffer } from 'buffer';

import { storageService } from '@/services/storageService';
import { SECURE_STORE_KEYS, STORAGE_KEYS } from '@/constants/config';
import type { DIDDocument, DIDMetadata } from '@/types';
import type { IDIDProvider, DIDCreateOptions, DIDProviderResult, JwsSigner } from '../types';

// ── Encoding utilities ────────────────────────────────────────────────────────

const ED25519_MULTICODEC_PREFIX = new Uint8Array([0xed, 0x01]);
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function encodeBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      const val = digits[i] * 256 + carry;
      digits[i] = val % 58;
      carry = Math.floor(val / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  let out = '1'.repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) out += BASE58_ALPHABET[digits[i]];
  return out;
}

function decodeBase58(s: string): Uint8Array {
  const bytes = [0];
  for (const char of s) {
    const val = BASE58_ALPHABET.indexOf(char);
    if (val < 0) throw new Error(`Invalid base58 character: ${char}`);
    let carry = val;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  let zeros = 0;
  while (zeros < s.length && s[zeros] === '1') zeros++;
  const result = new Uint8Array(zeros + bytes.length);
  bytes.reverse().forEach((b, i) => (result[zeros + i] = b));
  return result;
}

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

// ── DidKeyProvider ────────────────────────────────────────────────────────────

/**
 * DID provider for the `did:key` method using Ed25519 keys.
 * Uses @noble/curves for all signing operations (pure JS, no native bridge).
 * Private keys are stored in expo-secure-store (iOS Keychain / Android Keystore).
 */
export class DidKeyProvider implements IDIDProvider {
  readonly method = 'did:key';

  async create(_options: DIDCreateOptions = {}): Promise<DIDProviderResult> {
    // Generate seed using expo-crypto (avoids dependency on crypto.getRandomValues)
    const seed = ExpoCrypto.getRandomBytes(32);
    const pubKeyBytes = ed25519.getPublicKey(seed);

    const publicKeyMultibase = `z${encodeBase58(
      new Uint8Array([...ED25519_MULTICODEC_PREFIX, ...pubKeyBytes])
    )}`;
    const did = `did:key:${publicKeyMultibase}`;
    const keyId = `${did}#${publicKeyMultibase}`;
    const createdAt = new Date().toISOString();

    // Store 32-byte seed in SecureStore
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
    const didDocument = this._buildDocument(metadata, createdAt);

    await storageService.setItem(STORAGE_KEYS.DID_METADATA, metadata);
    await storageService.setItem(STORAGE_KEYS.DID_DOCUMENT, didDocument);

    return { did, keyId, publicKeyBytes: pubKeyBytes, metadata, didDocument };
  }

  async resolve(did: string): Promise<DIDDocument> {
    // Check local storage first (faster, avoids re-deriving)
    const stored = await storageService.getItem<DIDDocument>(STORAGE_KEYS.DID_DOCUMENT);
    if (stored && stored.id === did) return stored;

    const storedMeta = await storageService.getItem<DIDMetadata>(STORAGE_KEYS.DID_METADATA);
    if (storedMeta && storedMeta.did === did) {
      return this._buildDocument(storedMeta, storedMeta.registeredAt);
    }

    // Derive document from DID string itself (did:key is self-describing)
    const publicKeyMultibase = did.replace('did:key:', '');
    const keyId = `${did}#${publicKeyMultibase}`;
    const meta: DIDMetadata = {
      did,
      method: 'did:key',
      algorithm: 'Ed25519',
      keyId,
      publicKeyMultibase,
      registeredAt: new Date().toISOString(),
      status: 'active',
    };
    return this._buildDocument(meta, meta.registeredAt);
  }

  async sign(payload: Uint8Array, keyId: string): Promise<Uint8Array> {
    const stored = await SecureStore.getItemAsync(this._secureKey(keyId), {
      requireAuthentication: true,
      authenticationPrompt: '请验证身份以使用 DID 私钥签名',
    });
    if (!stored) throw new Error('DID 私钥不存在');

    const storedBytes = base64UrlToBytes(stored);
    // Handle both 32-byte seeds (new) and 64-byte expanded keys (legacy node-forge)
    const seed = storedBytes.length === 64 ? storedBytes.slice(0, 32) : storedBytes;
    return ed25519.sign(payload, seed);
  }

  async verify(payload: Uint8Array, sig: Uint8Array, did: string): Promise<boolean> {
    try {
      const doc = await this.resolve(did);
      const vm = doc.verificationMethod[0];
      // multibase 'z' prefix = base58btc
      const withPrefix = decodeBase58(vm.publicKeyMultibase.slice(1));
      const pubKeyBytes = withPrefix.slice(ED25519_MULTICODEC_PREFIX.length);
      return ed25519.verify(sig, payload, pubKeyBytes);
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

  // ── Helpers used by the didService compatibility wrapper ──────────────────

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

  // ── Private helpers ───────────────────────────────────────────────────────

  private _secureKey(keyId: string): string {
    const encodedKeyId = bytesToBase64Url(Buffer.from(keyId, 'utf8'));
    return `${SECURE_STORE_KEYS.DID_PRIVATE_KEY_PREFIX}${encodedKeyId}`;
  }

  private _buildDocument(metadata: DIDMetadata, createdAt: string): DIDDocument {
    return {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: metadata.did,
      verificationMethod: [
        {
          id: metadata.keyId,
          type: 'Ed25519VerificationKey2020',
          controller: metadata.did,
          publicKeyMultibase: metadata.publicKeyMultibase,
        },
      ],
      authentication: [metadata.keyId],
      assertionMethod: [metadata.keyId],
      created: createdAt,
      updated: createdAt,
    };
  }
}

export const didKeyProvider = new DidKeyProvider();
