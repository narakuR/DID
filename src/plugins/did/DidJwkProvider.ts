import * as SecureStore from 'expo-secure-store';
import * as ExpoCrypto from 'expo-crypto';
import { p256 } from '@noble/curves/nist.js';
import { Buffer } from 'buffer';

import { storageService } from '@/services/storageService';
import { SECURE_STORE_KEYS } from '@/constants/config';
import type { DIDDocument, DIDMetadata } from '@/types';
import type { IDIDProvider, DIDCreateOptions, DIDProviderResult, JwsSigner } from '../types';

// ── Encoding helpers ──────────────────────────────────────────────────────────

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

function stringToBase64Url(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ── P-256 public key → DID:JWK ───────────────────────────────────────────────

function pubKeyToJwk(pubKeyBytes: Uint8Array): {
  kty: string; crv: string; x: string; y: string;
} {
  // Uncompressed P-256 public key: [0x04, x(32), y(32)]
  if (pubKeyBytes.length === 65 && pubKeyBytes[0] === 0x04) {
    return {
      kty: 'EC',
      crv: 'P-256',
      x: bytesToBase64Url(pubKeyBytes.slice(1, 33)),
      y: bytesToBase64Url(pubKeyBytes.slice(33, 65)),
    };
  }
  // Compressed: derive uncompressed
  const uncompressed = p256.Point.fromBytes(pubKeyBytes).toBytes(false);
  return {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToBase64Url(uncompressed.slice(1, 33)),
    y: bytesToBase64Url(uncompressed.slice(33, 65)),
  };
}

function jwkToDid(jwk: { kty: string; crv: string; x: string; y: string }): string {
  return `did:jwk:${stringToBase64Url(JSON.stringify(jwk))}`;
}

// ── DidJwkProvider ────────────────────────────────────────────────────────────

const STORAGE_KEY_JWK_META = 'did_jwk_metadata';
const SECURE_KEY_JWK = `${SECURE_STORE_KEYS.DID_PRIVATE_KEY_PREFIX}jwk_p256`;

/**
 * DID provider for the `did:jwk` method using P-256 (ES256) keys.
 * The DID embeds the public JWK directly in the identifier (no network needed).
 * Private key stored in expo-secure-store.
 */
export class DidJwkProvider implements IDIDProvider {
  readonly method = 'did:jwk';

  async create(_options: DIDCreateOptions = {}): Promise<DIDProviderResult> {
    const seed = ExpoCrypto.getRandomBytes(32);
    const pubKeyBytes = p256.getPublicKey(seed, false); // uncompressed

    const jwk = pubKeyToJwk(pubKeyBytes);
    const did = jwkToDid(jwk);
    const keyId = `${did}#0`;
    const createdAt = new Date().toISOString();

    // Store 32-byte seed
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

    const didDocument = this._buildDocument(did, keyId, jwk, createdAt);
    await storageService.setItem(STORAGE_KEY_JWK_META, metadata);

    return { did, keyId, publicKeyBytes: pubKeyBytes, metadata, didDocument };
  }

  async resolve(did: string): Promise<DIDDocument> {
    const encoded = did.replace('did:jwk:', '');
    const jwk = JSON.parse(Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')) as {
      kty: string; crv: string; x: string; y: string;
    };
    const keyId = `${did}#0`;
    return this._buildDocument(did, keyId, jwk, new Date().toISOString());
  }

  async sign(payload: Uint8Array, _keyId: string): Promise<Uint8Array> {
    const stored = await SecureStore.getItemAsync(SECURE_KEY_JWK, {
      requireAuthentication: true,
      authenticationPrompt: '请验证身份以使用 DID JWK 私钥签名',
    });
    if (!stored) throw new Error('DID JWK 私钥不存在');

    const seed = base64UrlToBytes(stored);
    // p256.sign returns compact Uint8Array in v2
    return p256.sign(payload, seed, { lowS: true });
  }

  async verify(payload: Uint8Array, sig: Uint8Array, did: string): Promise<boolean> {
    try {
      const doc = await this.resolve(did);
      const vm = doc.verificationMethod[0];
      const jwk = vm.publicKeyJwk as { x: string; y: string };
      const xBytes = base64UrlToBytes(jwk.x);
      const yBytes = base64UrlToBytes(jwk.y);
      const pubKeyBytes = new Uint8Array([0x04, ...xBytes, ...yBytes]);
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

  private _buildDocument(
    did: string,
    keyId: string,
    jwk: { kty: string; crv: string; x: string; y: string },
    createdAt: string
  ): DIDDocument {
    return {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/jws-2020/v1',
      ],
      id: did,
      verificationMethod: [
        {
          id: keyId,
          type: 'JsonWebKey2020',
          controller: did,
          publicKeyMultibase: '',
          publicKeyJwk: jwk,
        },
      ],
      authentication: [keyId],
      assertionMethod: [keyId],
      created: createdAt,
      updated: createdAt,
    };
  }
}

export const didJwkProvider = new DidJwkProvider();
