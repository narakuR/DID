import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import forge from 'node-forge';

import { storageService } from '@/services/storageService';
import { SECURE_STORE_KEYS, STORAGE_KEYS } from '@/constants/config';
import { DIDDocument, DIDMetadata, DIDPrivateKeyRecord } from '@/types';

const DID_CONTEXT = 'https://www.w3.org/ns/did/v1' as const;
const ED25519_MULTICODEC_PREFIX = new Uint8Array([0xed, 0x01]);
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function bytesToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const normalized = padded + '='.repeat((4 - (padded.length % 4 || 4)) % 4);
  return Uint8Array.from(Buffer.from(normalized, 'base64'));
}

function encodeBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';

  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i += 1) {
      const value = digits[i] * 256 + carry;
      digits[i] = value % 58;
      carry = Math.floor(value / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  let zeroCount = 0;
  while (zeroCount < bytes.length && bytes[zeroCount] === 0) {
    zeroCount += 1;
  }

  let output = '1'.repeat(zeroCount);
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    output += BASE58_ALPHABET[digits[i]];
  }

  return output;
}

function getPrivateKeyStoreKey(keyId: string): string {
  const encodedKeyId = bytesToBase64Url(Buffer.from(keyId, 'utf8'));
  return `${SECURE_STORE_KEYS.DID_PRIVATE_KEY_PREFIX}${encodedKeyId}`;
}

function buildDidDocument(metadata: DIDMetadata, createdAt: string): DIDDocument {
  return {
    '@context': [DID_CONTEXT],
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

class DIDService {
  async generateDIDKeyPair(): Promise<{
    did: string;
    metadata: DIDMetadata;
    didDocument: DIDDocument;
  }> {
    const keyPair = forge.ed25519.generateKeyPair();
    const publicKey = Uint8Array.from(keyPair.publicKey);
    const privateKey = Uint8Array.from(keyPair.privateKey);
    const publicKeyMultibase = `z${encodeBase58(new Uint8Array([...ED25519_MULTICODEC_PREFIX, ...publicKey]))}`;
    const did = `did:key:${publicKeyMultibase}`;
    const keyId = `${did}#${publicKeyMultibase}`;
    const createdAt = new Date().toISOString();

    const privateKeyRecord: DIDPrivateKeyRecord = {
      keyId,
      algorithm: 'Ed25519',
      privateKeyBase64: bytesToBase64Url(privateKey),
      createdAt,
    };

    await SecureStore.setItemAsync(
      getPrivateKeyStoreKey(keyId),
      privateKeyRecord.privateKeyBase64,
      {
        requireAuthentication: true,
        authenticationPrompt: '请验证身份以访问 DID 私钥',
      }
    );

    const metadata: DIDMetadata = {
      did,
      method: 'did:key',
      algorithm: 'Ed25519',
      keyId,
      publicKeyMultibase,
      registeredAt: createdAt,
      status: 'active',
    };

    const didDocument = buildDidDocument(metadata, createdAt);

    await storageService.setItem(STORAGE_KEYS.DID_METADATA, metadata);
    await storageService.setItem(STORAGE_KEYS.DID_DOCUMENT, didDocument);

    return { did, metadata, didDocument };
  }

  async ensureDIDKeyPair(): Promise<{
    did: string;
    metadata: DIDMetadata;
    didDocument: DIDDocument;
    isNew: boolean;
  }> {
    const metadata = await this.getDIDMetadata();
    const didDocument = await this.getDIDDocument();

    if (metadata && didDocument) {
      return { did: metadata.did, metadata, didDocument, isNew: false };
    }

    const generated = await this.generateDIDKeyPair();
    return { ...generated, isNew: true };
  }

  async getDIDMetadata(): Promise<DIDMetadata | null> {
    return storageService.getItem<DIDMetadata>(STORAGE_KEYS.DID_METADATA);
  }

  async getDIDDocument(): Promise<DIDDocument | null> {
    const stored = await storageService.getItem<DIDDocument>(STORAGE_KEYS.DID_DOCUMENT);
    if (stored) return stored;

    const metadata = await this.getDIDMetadata();
    if (!metadata) return null;

    return buildDidDocument(metadata, metadata.registeredAt);
  }

  async exportDIDDocumentToDevice(): Promise<string> {
    const didDocument = await this.getDIDDocument();
    if (!didDocument) {
      throw new Error('DID 文档不存在，请先生成 DID 密钥对。');
    }

    const cacheDirectory = FileSystem.cacheDirectory;
    if (!cacheDirectory) {
      throw new Error('当前设备不可用文件缓存目录。');
    }

    const filename = `${didDocument.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    const fileUri = `${cacheDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(didDocument, null, 2), {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const sharingAvailable = await Sharing.isAvailableAsync();
    if (!sharingAvailable) {
      return fileUri;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: '导出 DID 公钥文档',
      UTI: 'public.json',
    });

    return fileUri;
  }

  async signWithDID(payload: Uint8Array, keyId?: string): Promise<Uint8Array> {
    const metadata = keyId ? null : await this.getDIDMetadata();
    const resolvedKeyId = keyId ?? metadata?.keyId;
    if (!resolvedKeyId) {
      throw new Error('DID 私钥不存在。');
    }

    const privateKeyBase64 = await SecureStore.getItemAsync(getPrivateKeyStoreKey(resolvedKeyId), {
      requireAuthentication: true,
      authenticationPrompt: '请验证身份以使用 DID 私钥签名',
    });
    if (!privateKeyBase64) {
      throw new Error('DID 私钥不存在。');
    }

    const signature = forge.ed25519.sign({
      message: Buffer.from(payload),
      privateKey: Buffer.from(base64UrlToBytes(privateKeyBase64)),
    });

    return Uint8Array.from(signature);
  }

  getPrivateKeyLocationHint(keyId: string): { storeKey: string; location: string } {
    return {
      storeKey: getPrivateKeyStoreKey(keyId),
      location: '私钥保存在系统安全存储中：iOS 为 Keychain，Android 为 Keystore/Encrypted SharedPreferences，由 expo-secure-store 管理。',
    };
  }

  async getStoredPrivateKeyValue(keyId: string): Promise<string | null> {
    return SecureStore.getItemAsync(getPrivateKeyStoreKey(keyId), {
      requireAuthentication: true,
      authenticationPrompt: '请验证身份以查看 DID 私钥',
    });
  }
}

export const didService = new DIDService();
