import { parseJwtUnsafe, base64UrlToBytes } from '@/wallet-core/utils/jwtUtils';
import type { VerifyResult } from '@/wallet-core/types/credential';

export async function verifyJwtByIssuerDid(raw: string): Promise<VerifyResult> {
  try {
    const { payload, signingInput, signature } = parseJwtUnsafe(raw);

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === 'number' && payload.exp < now) {
      return { valid: false, error: 'JWT expired' };
    }
    if (typeof payload.nbf === 'number' && payload.nbf > now) {
      return { valid: false, error: 'JWT not yet valid' };
    }

    const issuerDid = typeof payload.iss === 'string' ? payload.iss : null;
    if (!issuerDid) {
      return { valid: false, error: 'Missing iss claim' };
    }

    const sigBytes = base64UrlToBytes(signature);
    const inputBytes = new TextEncoder().encode(signingInput);

    let verified = false;

    if (issuerDid.startsWith('did:web:')) {
      const { didWebProvider } = await import('@/wallet-core/did/DidWebProvider');
      verified = await didWebProvider.verify(inputBytes, sigBytes, issuerDid);
    } else if (issuerDid.startsWith('did:jwk:')) {
      const { didJwkProvider } = await import('@/wallet-core/did/DidJwkProvider');
      verified = await didJwkProvider.verify(inputBytes, sigBytes, issuerDid);
    } else if (issuerDid.startsWith('did:key:')) {
      const { didKeyProvider } = await import('@/wallet-core/did/DidKeyProvider');
      verified = await didKeyProvider.verify(inputBytes, sigBytes, issuerDid);
    } else {
      const method = issuerDid.split(':')[1] ?? issuerDid;
      return { valid: false, error: `Unsupported DID method: ${method}` };
    }

    return verified
      ? { valid: true }
      : { valid: false, error: 'Signature verification failed' };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Verification error',
    };
  }
}

export async function verifyCompactJwtWithJwk(
  compact: string,
  jwk: Record<string, string>
): Promise<boolean> {
  try {
    const { signingInput, signature } = parseJwtUnsafe(compact);
    const sigBytes = base64UrlToBytes(signature);
    const inputBytes = new TextEncoder().encode(signingInput);

    if (jwk.crv === 'Ed25519' && jwk.kty === 'OKP') {
      const { ed25519 } = await import('@noble/curves/ed25519.js');
      const pubBytes = base64UrlToBytes(jwk.x);
      return ed25519.verify(sigBytes, inputBytes, pubBytes);
    }

    if (jwk.crv === 'P-256' && jwk.kty === 'EC') {
      const { p256 } = await import('@noble/curves/nist.js');
      const xBytes = base64UrlToBytes(jwk.x);
      const yBytes = base64UrlToBytes(jwk.y ?? '');
      const pubBytes = new Uint8Array([0x04, ...xBytes, ...yBytes]);
      return p256.verify(sigBytes, inputBytes, pubBytes);
    }

    return false;
  } catch {
    return false;
  }
}
