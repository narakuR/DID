import { p256 } from '@noble/curves/nist.js';
import { Buffer } from 'buffer';

import type { DIDDocument } from '@/types';

export type P256PublicJwk = {
  kty: 'EC';
  crv: 'P-256';
  x: string;
  y: string;
};

export type P256PrivateJwk = P256PublicJwk & {
  d: string;
};

export function bytesToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlToBytes(value: string): Uint8Array {
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

export function publicKeyToP256Jwk(pubKeyBytes: Uint8Array): P256PublicJwk {
  if (pubKeyBytes.length === 65 && pubKeyBytes[0] === 0x04) {
    return {
      kty: 'EC',
      crv: 'P-256',
      x: bytesToBase64Url(pubKeyBytes.slice(1, 33)),
      y: bytesToBase64Url(pubKeyBytes.slice(33, 65)),
    };
  }

  const uncompressed = p256.Point.fromBytes(pubKeyBytes).toBytes(false);
  return {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToBase64Url(uncompressed.slice(1, 33)),
    y: bytesToBase64Url(uncompressed.slice(33, 65)),
  };
}

export function privateSeedToP256Jwk(seed: Uint8Array): P256PrivateJwk {
  const publicJwk = publicKeyToP256Jwk(p256.getPublicKey(seed, false));
  return {
    ...publicJwk,
    d: bytesToBase64Url(seed),
  };
}

export function didFromPublicJwk(jwk: P256PublicJwk): string {
  return `did:jwk:${stringToBase64Url(JSON.stringify(jwk))}`;
}

export function createDidJwkDocument(options: {
  seed: Uint8Array;
  createdAt: string;
}): {
  did: string;
  keyId: string;
  publicKeyBytes: Uint8Array;
  publicJwk: P256PublicJwk;
  didDocument: DIDDocument;
} {
  const publicKeyBytes = p256.getPublicKey(options.seed, false);
  const publicJwk = publicKeyToP256Jwk(publicKeyBytes);
  const did = didFromPublicJwk(publicJwk);
  const keyId = `${did}#0`;

  return {
    did,
    keyId,
    publicKeyBytes,
    publicJwk,
    didDocument: buildDidJwkDocument(did, keyId, publicJwk, options.createdAt),
  };
}

export function resolveDidJwkDocument(did: string, timestamp: string): DIDDocument {
  const encoded = did.replace('did:jwk:', '');
  const publicJwk = JSON.parse(
    Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
  ) as P256PublicJwk;

  return buildDidJwkDocument(did, `${did}#0`, publicJwk, timestamp);
}

export function publicKeyBytesFromDidJwk(did: string): Uint8Array {
  const doc = resolveDidJwkDocument(did, new Date().toISOString());
  return publicKeyBytesFromPublicJwk(doc.verificationMethod[0].publicKeyJwk as P256PublicJwk);
}

export function publicKeyBytesFromPublicJwk(jwk: P256PublicJwk): Uint8Array {
  const xBytes = base64UrlToBytes(jwk.x);
  const yBytes = base64UrlToBytes(jwk.y);
  return new Uint8Array([0x04, ...xBytes, ...yBytes]);
}

function buildDidJwkDocument(
  did: string,
  keyId: string,
  jwk: P256PublicJwk,
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
