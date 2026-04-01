import { ed25519 } from '@noble/curves/ed25519.js';
import { Buffer } from 'buffer';

import type { DIDDocument } from '@/types';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ED25519_MULTICODEC_PREFIX = new Uint8Array([0xed, 0x01]);
const DID_KEY_CONTEXT = 'https://www.w3.org/ns/did/v1';

function encodeBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) {
    return '';
  }

  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let index = 0; index < digits.length; index += 1) {
      const value = digits[index] * 256 + carry;
      digits[index] = value % 58;
      carry = Math.floor(value / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  for (let index = 0; index < bytes.length && bytes[index] === 0; index += 1) {
    digits.push(0);
  }

  return digits
    .reverse()
    .map((digit) => BASE58_ALPHABET[digit])
    .join('');
}

function decodeBase58(value: string): Uint8Array {
  if (!value) {
    return new Uint8Array();
  }

  const bytes = [0];
  for (const char of value) {
    const digit = BASE58_ALPHABET.indexOf(char);
    if (digit < 0) {
      throw new Error(`Invalid base58 character: ${char}`);
    }

    let carry = digit;
    for (let index = 0; index < bytes.length; index += 1) {
      const next = bytes[index] * 58 + carry;
      bytes[index] = next & 0xff;
      carry = next >> 8;
    }

    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  let zeroCount = 0;
  while (zeroCount < value.length && value[zeroCount] === '1') {
    zeroCount += 1;
  }

  const result = new Uint8Array(zeroCount + bytes.length);
  bytes.reverse().forEach((byte, index) => {
    result[zeroCount + index] = byte;
  });

  return result;
}

function buildPublicKeyMultibase(publicKeyBytes: Uint8Array): string {
  const multicodec = new Uint8Array(ED25519_MULTICODEC_PREFIX.length + publicKeyBytes.length);
  multicodec.set(ED25519_MULTICODEC_PREFIX, 0);
  multicodec.set(publicKeyBytes, ED25519_MULTICODEC_PREFIX.length);
  return `z${encodeBase58(multicodec)}`;
}

function publicKeyBytesFromMultibase(publicKeyMultibase: string): Uint8Array {
  const normalized = publicKeyMultibase.startsWith('z')
    ? publicKeyMultibase.slice(1)
    : publicKeyMultibase;
  const decoded = decodeBase58(normalized);

  if (
    decoded.length < ED25519_MULTICODEC_PREFIX.length ||
    decoded[0] !== ED25519_MULTICODEC_PREFIX[0] ||
    decoded[1] !== ED25519_MULTICODEC_PREFIX[1]
  ) {
    throw new Error(`Unsupported did:key multicodec prefix: ${publicKeyMultibase}`);
  }

  return decoded.slice(ED25519_MULTICODEC_PREFIX.length);
}

function buildDidDocument(options: {
  did: string;
  keyId: string;
  publicKeyMultibase: string;
  timestamp: string;
}): DIDDocument {
  return {
    '@context': [DID_KEY_CONTEXT],
    id: options.did,
    verificationMethod: [
      {
        id: options.keyId,
        type: 'Ed25519VerificationKey2020',
        controller: options.did,
        publicKeyMultibase: options.publicKeyMultibase,
      },
    ],
    authentication: [options.keyId],
    assertionMethod: [options.keyId],
    created: options.timestamp,
    updated: options.timestamp,
  };
}

export async function createDidKeyDocument(options: {
  seed: Uint8Array;
  createdAt: string;
}): Promise<{
  did: string;
  keyId: string;
  publicKeyMultibase: string;
  publicKeyBytes: Uint8Array;
  didDocument: DIDDocument;
}> {
  const publicKeyBytes = ed25519.getPublicKey(options.seed);
  const publicKeyMultibase = buildPublicKeyMultibase(publicKeyBytes);
  const did = `did:key:${publicKeyMultibase}`;
  const keyId = `${did}#${publicKeyMultibase}`;

  return {
    did,
    keyId,
    publicKeyMultibase,
    publicKeyBytes,
    didDocument: buildDidDocument({
      did,
      keyId,
      publicKeyMultibase,
      timestamp: options.createdAt,
    }),
  };
}

export async function resolveDidKeyDocument(did: string, timestamp: string): Promise<DIDDocument> {
  if (!did.startsWith('did:key:')) {
    throw new Error(`Unable to resolve non did:key identifier: ${did}`);
  }

  const publicKeyMultibase = did.replace('did:key:', '');
  publicKeyBytesFromMultibase(publicKeyMultibase);
  const keyId = `${did}#${publicKeyMultibase}`;

  return buildDidDocument({
    did,
    keyId,
    publicKeyMultibase,
    timestamp,
  });
}

export function verifyDidKeySignature(options: {
  payload: Uint8Array;
  signature: Uint8Array;
  publicKeyMultibase: string;
}): boolean {
  const publicKeyBytes = publicKeyBytesFromMultibase(options.publicKeyMultibase);
  return ed25519.verify(options.signature, options.payload, publicKeyBytes);
}
