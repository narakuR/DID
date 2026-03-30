import { sha256 } from '@noble/hashes/sha2.js';
import { keyManager } from '@/wallet-core/did/KeyManager';
import { signerFactory } from '@/wallet-core/did/SignerFactory';
import {
  bytesToBase64Url,
  parseJwtUnsafe,
  stringToBase64Url,
} from '@/wallet-core/utils/jwtUtils';
import type { RequestObject } from './types';

export async function buildKeyBindingJwt(
  presentedSdJwt: string,
  requestObject: RequestObject
): Promise<string> {
  const issuerJwt = presentedSdJwt.split('~')[0];
  const { payload } = parseJwtUnsafe(issuerJwt);
  const cnf = payload.cnf as { jwk?: { kty?: string; crv?: string } } | undefined;
  const aud = requestObject.client_id;
  const nonce = requestObject.nonce;

  if (!aud || !nonce) {
    throw new Error('OID4VP request object is missing client_id or nonce for key binding');
  }

  const sdHash = bytesToBase64Url(sha256(new TextEncoder().encode(presentedSdJwt)));
  const now = Math.floor(Date.now() / 1000);
  const key = await keyManager.getSdJwtKeyBindingKey({ cnf });
  const alg = key.alg;
  const sign = signerFactory.createRawSigner(key);

  const header = {
    typ: 'kb+jwt',
    alg,
  };
  const payloadForKb = {
    iat: now,
    aud,
    nonce,
    sd_hash: sdHash,
  };

  const signingInput = `${stringToBase64Url(JSON.stringify(header))}.${stringToBase64Url(
    JSON.stringify(payloadForKb)
  )}`;
  const signature = await sign(new TextEncoder().encode(signingInput));
  return `${signingInput}.${bytesToBase64Url(signature)}`;
}
