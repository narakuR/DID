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

import { didKeyProvider } from '@/wallet-core/did/DidKeyProvider';
import { didJwkProvider } from '@/wallet-core/did/DidJwkProvider';
import { didWebProvider } from '@/wallet-core/did/DidWebProvider';
import { parseJwtUnsafe, base64UrlToBytes } from '@/wallet-core/utils/jwtUtils';
import { verifyCompactJwtWithJwk } from '@/wallet-core/utils/credentialVerify';

export { clientAuthenticationNone };

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ED25519_PREFIX_LEN = 2;

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

function pubKeyBytesFromDidKey(did: string): Uint8Array {
  const multibase = did.replace('did:key:', '');
  if (!multibase.startsWith('z')) throw new Error('Only z (base58btc) multibase supported');
  const withPrefix = decodeBase58(multibase.slice(1));
  return withPrefix.slice(ED25519_PREFIX_LEN);
}

function pubJwkFromDidKey(did: string): Jwk {
  const pubKeyBytes = pubKeyBytesFromDidKey(did);
  return { kty: 'OKP', crv: 'Ed25519', x: bytesToBase64Url(pubKeyBytes) } as Jwk;
}

const hashCallback = (data: Uint8Array, alg: HashAlgorithm): Uint8Array => {
  if ((alg as string) !== 'sha-256') throw new Error(`Unsupported hash algorithm: ${alg}`);
  return sha256(data);
};

const generateRandomCallback = (byteLength: number): Uint8Array => {
  return ExpoCrypto.getRandomBytes(byteLength);
};

const signJwtCallback = async (
  jwtSigner: JwtSigner,
  jwt: { header: JwtHeader; payload: JwtPayload }
): Promise<{ jwt: string; signerJwk: Jwk }> => {
  const resolveSigner = async (): Promise<{
    keyId: string;
    did: string;
    sign: (input: Uint8Array, keyId: string) => Promise<Uint8Array>;
    signerJwk: Jwk;
  }> => {
    if (jwtSigner.method === 'jwk') {
      const meta = await didJwkProvider.getStoredMetadata();
      if (!meta) throw new Error('No ES256 DID found. Please generate a DID:JWK first.');
      return {
        keyId: meta.keyId,
        did: meta.did,
        sign: (input, keyId) => didJwkProvider.sign(input, keyId),
        signerJwk: (jwtSigner as { method: 'jwk'; publicJwk: Jwk }).publicJwk,
      };
    }

    if (jwtSigner.method === 'did') {
      const didUrl = (jwtSigner as { method: 'did'; didUrl: string }).didUrl;
      if (didUrl.startsWith('did:jwk:')) {
        const meta = await didJwkProvider.getStoredMetadata();
        if (!meta) throw new Error('No ES256 DID found. Please generate a DID:JWK first.');
        const doc = await didJwkProvider.resolve(meta.did);
        return {
          keyId: meta.keyId,
          did: meta.did,
          sign: (input, keyId) => didJwkProvider.sign(input, keyId),
          signerJwk: doc.verificationMethod[0].publicKeyJwk as Jwk,
        };
      }
    }

    const meta = await didKeyProvider.getStoredMetadata();
    if (!meta) throw new Error('No active DID found. Please generate a DID first.');
    return {
      keyId: meta.keyId,
      did: meta.did,
      sign: (input, keyId) => didKeyProvider.sign(input, keyId),
      signerJwk: pubJwkFromDidKey(meta.did),
    };
  };

  const signer = await resolveSigner();
  const headerStr = stringToBase64Url(JSON.stringify(jwt.header));
  const payloadStr = stringToBase64Url(JSON.stringify(jwt.payload));
  const signingInput = `${headerStr}.${payloadStr}`;

  const signingInputBytes = new TextEncoder().encode(signingInput);
  const signatureBytes = await signer.sign(signingInputBytes, signer.keyId);
  const compactJwt = `${signingInput}.${bytesToBase64Url(signatureBytes)}`;
  return { jwt: compactJwt, signerJwk: signer.signerJwk };
};

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

const verifyJwtCallback: VerifyJwtCallback = async (jwtSigner, jwt) => {
  try {
    const now = Math.floor(Date.now() / 1000);
    if (typeof jwt.payload.exp === 'number' && jwt.payload.exp < now) {
      return { verified: false };
    }
    if (typeof jwt.payload.nbf === 'number' && jwt.payload.nbf > now) {
      return { verified: false };
    }

    if (jwtSigner.method === 'jwk') {
      const publicJwk = (jwtSigner as { method: 'jwk'; publicJwk: Jwk }).publicJwk;
      const ok = await verifyCompactJwtWithJwk(jwt.compact, publicJwk as Record<string, string>);
      return ok ? { verified: true, signerJwk: publicJwk } : { verified: false };
    }

    if (jwtSigner.method === 'did') {
      const did = (jwtSigner as { method: 'did'; didUrl: string }).didUrl.split('#')[0];
      const { signingInput, signature } = parseJwtUnsafe(jwt.compact);
      const sigBytes = base64UrlToBytes(signature);
      const inputBytes = new TextEncoder().encode(signingInput);

      if (did.startsWith('did:key:')) {
        const ok = await didKeyProvider.verify(inputBytes, sigBytes, did);
        if (!ok) return { verified: false };
        return { verified: true, signerJwk: pubJwkFromDidKey(did) };
      }

      if (did.startsWith('did:jwk:')) {
        const ok = await didJwkProvider.verify(inputBytes, sigBytes, did);
        if (!ok) return { verified: false };
        const doc = await didJwkProvider.resolve(did);
        const signerJwk = doc.verificationMethod[0].publicKeyJwk as Jwk;
        return { verified: true, signerJwk };
      }

      if (did.startsWith('did:web:')) {
        const ok = await didWebProvider.verify(inputBytes, sigBytes, did);
        if (!ok) return { verified: false };
        const doc = await didWebProvider.resolve(did);
        const signerJwk = doc.verificationMethod[0].publicKeyJwk as Jwk;
        return { verified: true, signerJwk };
      }

      return { verified: false };
    }

    return { verified: false };
  } catch {
    return { verified: false };
  }
};

const encryptJweStub: EncryptJweCallback = async () => {
  throw new Error('JWE encryption not supported in this version');
};

const decryptJweStub: DecryptJweCallback = async () => ({ decrypted: false });

export function buildOid4vpCallbacks(): Omit<
  CallbackContext,
  'generateRandom' | 'clientAuthentication'
> {
  return {
    hash: hashCallback,
    signJwt: signJwtCallback,
    verifyJwt: verifyJwtCallback,
    encryptJwe: encryptJweStub,
    decryptJwe: decryptJweStub,
  };
}
