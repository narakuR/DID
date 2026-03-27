import { base64UrlToString } from '@/wallet-core/utils/jwtUtils';
import { buildKeyBindingJwt } from './keyBindingBuilder';

jest.mock('@noble/hashes/sha2.js', () => ({
  sha256: jest.fn(() => new Uint8Array([9, 8, 7, 6])),
}));

jest.mock('@/wallet-core/did/DidJwkProvider', () => ({
  didJwkProvider: {
    getStoredMetadata: jest.fn(),
    sign: jest.fn(),
  },
}));

jest.mock('@/wallet-core/did/DidKeyProvider', () => ({
  didKeyProvider: {
    getStoredMetadata: jest.fn(),
    sign: jest.fn(),
  },
}));

const { didJwkProvider } = jest.requireMock('@/wallet-core/did/DidJwkProvider') as {
  didJwkProvider: {
    getStoredMetadata: jest.Mock;
    sign: jest.Mock;
  };
};
const { didKeyProvider } = jest.requireMock('@/wallet-core/did/DidKeyProvider') as {
  didKeyProvider: {
    getStoredMetadata: jest.Mock;
    sign: jest.Mock;
  };
};

function buildIssuerJwt(payload: Record<string, unknown>) {
  const encodedHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' }))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const encodedPayload = Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${encodedHeader}.${encodedPayload}.bbb`;
}

describe('keyBindingBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('在缺少 client_id 或 nonce 时抛错', async () => {
    await expect(
      buildKeyBindingJwt(buildIssuerJwt({}), { nonce: 'n1' })
    ).rejects.toThrow('OID4VP request object is missing client_id or nonce for key binding');
  });

  it('对 P-256 cnf 使用 did:jwk / ES256 签名', async () => {
    didJwkProvider.getStoredMetadata.mockResolvedValue({
      keyId: 'did:jwk:test#0',
    });
    didJwkProvider.sign.mockResolvedValue(new Uint8Array([1, 2, 3]));

    const kbJwt = await buildKeyBindingJwt(
      `${buildIssuerJwt({
        cnf: {
          jwk: {
            kty: 'EC',
            crv: 'P-256',
          },
        },
      })}~disc`,
      {
        client_id: 'https://verifier.example',
        nonce: 'nonce-1',
      }
    );

    const [headerPart, payloadPart, signaturePart] = kbJwt.split('.');
    expect(JSON.parse(base64UrlToString(headerPart))).toEqual({
      typ: 'kb+jwt',
      alg: 'ES256',
    });
    const payload = JSON.parse(base64UrlToString(payloadPart));
    expect(payload.aud).toBe('https://verifier.example');
    expect(payload.nonce).toBe('nonce-1');
    expect(typeof payload.sd_hash).toBe('string');
    expect(signaturePart.length).toBeGreaterThan(0);
  });

  it('对非 P-256 默认使用 did:key / EdDSA 签名', async () => {
    didKeyProvider.getStoredMetadata.mockResolvedValue({
      keyId: 'did:key:test#z6',
    });
    didKeyProvider.sign.mockResolvedValue(new Uint8Array([4, 5, 6]));

    const kbJwt = await buildKeyBindingJwt(
      buildIssuerJwt({
        cnf: {
          jwk: {
            kty: 'OKP',
            crv: 'Ed25519',
          },
        },
      }),
      {
        client_id: 'https://verifier.example',
        nonce: 'nonce-1',
      }
    );

    const [headerPart] = kbJwt.split('.');
    expect(JSON.parse(base64UrlToString(headerPart))).toEqual({
      typ: 'kb+jwt',
      alg: 'EdDSA',
    });
  });

  it('在缺少 did:jwk 密钥时抛错', async () => {
    didJwkProvider.getStoredMetadata.mockResolvedValue(null);

    await expect(
      buildKeyBindingJwt(
        buildIssuerJwt({
          cnf: {
            jwk: {
              kty: 'EC',
              crv: 'P-256',
            },
          },
        }),
        {
          client_id: 'https://verifier.example',
          nonce: 'nonce-1',
        }
      )
    ).rejects.toThrow('Missing DID:JWK key required for SD-JWT key binding');
  });

  it('在缺少 did:key 密钥时抛错', async () => {
    didKeyProvider.getStoredMetadata.mockResolvedValue(null);

    await expect(
      buildKeyBindingJwt(buildIssuerJwt({}), {
        client_id: 'https://verifier.example',
        nonce: 'nonce-1',
      })
    ).rejects.toThrow('Missing DID:key required for SD-JWT key binding');
  });
});
