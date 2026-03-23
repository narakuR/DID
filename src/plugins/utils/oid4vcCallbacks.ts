import * as ExpoCrypto from 'expo-crypto';
import { sha256 } from '@noble/hashes/sha2.js';
import { Buffer } from 'buffer';
import type {
  CallbackContext,
  HashAlgorithm,
  JwtSigner,
  JwtHeader,
  JwtPayload,
  Jwk,
  VerifyJwtCallback,
  DecryptJweCallback,
  EncryptJweCallback,
} from '@openid4vc/oauth2';
import { clientAuthenticationNone } from '@openid4vc/oauth2';

import { didKeyProvider } from '../did/DidKeyProvider';

// Re-export for external use
export { clientAuthenticationNone };

// ── Encoding helpers ──────────────────────────────────────────────────────────

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ED25519_PREFIX_LEN = 2; // [0xed, 0x01]

function decodeBase58(s: string): Uint8Array {
  const bytes = [0];
  for (const char of s) {
    const val = BASE58_ALPHABET.indexOf(char);
    if (val < 0) throw new Error(`Invalid base58: ${char}`);
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

function stringToBase64Url(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ── Public key extraction from did:key multibase ──────────────────────────────

function pubKeyBytesFromDidKey(did: string): Uint8Array {
  // did:key:z<base58btc(multicodec_prefix + pubkey)>
  const multibase = did.replace('did:key:', '');
  if (!multibase.startsWith('z')) throw new Error('Only z (base58btc) multibase supported');
  const withPrefix = decodeBase58(multibase.slice(1));
  return withPrefix.slice(ED25519_PREFIX_LEN);
}

function pubJwkFromDidKey(did: string): Jwk {
  const pubKeyBytes = pubKeyBytesFromDidKey(did);
  return { kty: 'OKP', crv: 'Ed25519', x: bytesToBase64Url(pubKeyBytes) } as Jwk;
}

// ── Callback implementations ──────────────────────────────────────────────────

/**
 * Hash callback — uses @noble/hashes/sha2 (pure JS, no Web Crypto needed).
 * Only sha-256 is used by oid4vc-ts for PKCE and DPoP.
 */
const hashCallback = (data: Uint8Array, alg: HashAlgorithm): Uint8Array => {
  if ((alg as string) !== 'sha-256') throw new Error(`Unsupported hash algorithm: ${alg}`);
  return sha256(data);
};

/**
 * Secure random bytes — uses expo-crypto (safe on Hermes, avoids crypto.getRandomValues).
 */
const generateRandomCallback = (byteLength: number): Uint8Array => {
  return ExpoCrypto.getRandomBytes(byteLength);
};

/**
 * JWT signing callback for oid4vc-ts.
 *
 * Supports:
 *  - method: 'did'  → Ed25519 sign via DidKeyProvider
 *  - method: 'jwk'  → Ed25519 sign via DidKeyProvider (assumes active DID)
 *  - method: 'custom' → Ed25519 sign via DidKeyProvider (assumes active DID)
 *
 * Returns a compact JWS and the corresponding public JWK.
 */
const signJwtCallback = async (
  jwtSigner: JwtSigner,
  jwt: { header: JwtHeader; payload: JwtPayload }
): Promise<{ jwt: string; signerJwk: Jwk }> => {
  const meta = await didKeyProvider.getStoredMetadata();
  if (!meta) throw new Error('No active DID found. Please generate a DID first.');

  const keyId = meta.keyId;
  const did = meta.did;

  // Build the signing input: base64url(header).base64url(payload)
  const headerStr = stringToBase64Url(JSON.stringify(jwt.header));
  const payloadStr = stringToBase64Url(JSON.stringify(jwt.payload));
  const signingInput = `${headerStr}.${payloadStr}`;

  const signingInputBytes = new TextEncoder().encode(signingInput);
  const signatureBytes = await didKeyProvider.sign(signingInputBytes, keyId);
  const compactJwt = `${signingInput}.${bytesToBase64Url(signatureBytes)}`;

  let signerJwk: Jwk;
  if (jwtSigner.method === 'jwk') {
    signerJwk = (jwtSigner as { method: 'jwk'; publicJwk: Jwk }).publicJwk;
  } else {
    signerJwk = pubJwkFromDidKey(did);
  }

  return { jwt: compactJwt, signerJwk };
};

// ── Public factories ──────────────────────────────────────────────────────────

/**
 * Build the callback context required by Openid4vciClient.
 * `clientId` is used for the `none` client authentication scheme (public client).
 */
export function buildOid4vcCallbacks(
  clientId = 'wallet'
): Omit<CallbackContext, 'verifyJwt' | 'decryptJwe' | 'encryptJwe'> {
  return {
    hash: hashCallback,
    generateRandom: generateRandomCallback,
    signJwt: signJwtCallback,
    clientAuthentication: clientAuthenticationNone({ clientId }),
  };
}

/**
 * Stub verifyJwt — signature verification deferred to Phase 5+.
 * Returns `verified: true` for all JWTs (trusts the transport).
 */
const verifyJwtStub: VerifyJwtCallback = async (_jwtSigner, jwt) => {
  const header = jwt.header as Record<string, unknown>;
  const alg = typeof header.alg === 'string' ? header.alg : 'EdDSA';
  const signerJwk: Jwk =
    alg === 'EdDSA'
      ? ({ kty: 'OKP', crv: 'Ed25519', x: '' } as Jwk)
      : ({ kty: 'EC', crv: 'P-256', x: '', y: '' } as Jwk);
  return { verified: true, signerJwk };
};

/** Stub — JWE encryption not needed for direct_post response mode. */
const encryptJweStub: EncryptJweCallback = async () => {
  throw new Error('JWE encryption not supported in this version');
};

/** Stub — JWE decryption not needed for direct_post response mode. */
const decryptJweStub: DecryptJweCallback = async () => ({ decrypted: false });

/**
 * Build the callback context required by Openid4vpClient.
 * `verifyJwt` is stubbed (verification deferred); JWE stubs throw if called.
 */
export function buildOid4vpCallbacks(): Omit<
  CallbackContext,
  'generateRandom' | 'clientAuthentication'
> {
  return {
    hash: hashCallback,
    signJwt: signJwtCallback,
    verifyJwt: verifyJwtStub,
    encryptJwe: encryptJweStub,
    decryptJwe: decryptJweStub,
  };
}
