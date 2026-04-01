import { DidWebProvider } from '@/wallet-core/did/DidWebProvider';
import { resolveDidWebDocument } from '@/wallet-core/did/didWebAdapter';

jest.mock('@/wallet-core/did/didWebAdapter', () => ({
  resolveDidWebDocument: jest.fn(),
}));

const mockedResolveDidWebDocument = resolveDidWebDocument as jest.MockedFunction<
  typeof resolveDidWebDocument
>;

function bytesToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

describe('DidWebProvider', () => {
  const provider = new DidWebProvider();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolve 通过 did:web adapter 获取文档', async () => {
    const doc = {
      '@context': ['https://www.w3.org/ns/did/v1'] as ['https://www.w3.org/ns/did/v1'],
      id: 'did:web:example.com',
      verificationMethod: [
        {
          id: 'did:web:example.com#key-1',
          type: 'JsonWebKey2020' as const,
          controller: 'did:web:example.com',
          publicKeyMultibase: '',
          publicKeyJwk: {
            kty: 'OKP',
            crv: 'Ed25519',
            x: bytesToBase64Url(Uint8Array.from({ length: 32 }, (_, i) => i + 1)),
          },
        },
      ],
      authentication: ['did:web:example.com#key-1'],
      assertionMethod: ['did:web:example.com#key-1'],
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
    };
    mockedResolveDidWebDocument.mockResolvedValue(doc);

    const resolved = await provider.resolve('did:web:example.com');

    expect(mockedResolveDidWebDocument).toHaveBeenCalledWith(
      'did:web:example.com',
      expect.any(String)
    );
    expect(resolved).toBe(doc);
  });

  it('resolve 保留 resolver 失败错误', async () => {
    mockedResolveDidWebDocument.mockRejectedValue(new Error('resolver failed'));

    await expect(provider.resolve('did:web:example.com')).rejects.toThrow('resolver failed');
  });

  it('create/sign/asJwsSigner 继续保持只读 provider 行为', async () => {
    await expect(provider.create()).rejects.toThrow('did:web does not support local key generation');
    await expect(provider.sign(new Uint8Array([1]), 'key')).rejects.toThrow(
      'did:web signing is not supported by the wallet'
    );
    expect(() => provider.asJwsSigner('key')).toThrow(
      'did:web signing is not supported by the wallet'
    );
  });

  it('verify 支持 Ed25519 publicKeyJwk', async () => {
    const { ed25519 } = await import('@noble/curves/ed25519.js');
    const privateKey = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
    const publicKey = ed25519.getPublicKey(privateKey);
    const payload = new Uint8Array([1, 2, 3, 4]);
    const signature = ed25519.sign(payload, privateKey);

    mockedResolveDidWebDocument.mockResolvedValue({
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: 'did:web:example.com',
      verificationMethod: [
        {
          id: 'did:web:example.com#key-1',
          type: 'JsonWebKey2020',
          controller: 'did:web:example.com',
          publicKeyMultibase: '',
          publicKeyJwk: {
            kty: 'OKP',
            crv: 'Ed25519',
            x: bytesToBase64Url(publicKey),
          },
        },
      ],
      authentication: ['did:web:example.com#key-1'],
      assertionMethod: ['did:web:example.com#key-1'],
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
    });

    await expect(provider.verify(payload, signature, 'did:web:example.com')).resolves.toBe(true);
  });

  it('verify 支持 P-256 publicKeyJwk', async () => {
    const { p256 } = await import('@noble/curves/nist.js');
    const privateKey = Uint8Array.from({ length: 32 }, (_, i) => i + 10);
    const publicKey = p256.getPublicKey(privateKey, false);
    const payload = new Uint8Array([9, 8, 7, 6]);
    const signature = p256.sign(payload, privateKey);

    mockedResolveDidWebDocument.mockResolvedValue({
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: 'did:web:example.com',
      verificationMethod: [
        {
          id: 'did:web:example.com#key-1',
          type: 'JsonWebKey2020',
          controller: 'did:web:example.com',
          publicKeyMultibase: '',
          publicKeyJwk: {
            kty: 'EC',
            crv: 'P-256',
            x: bytesToBase64Url(publicKey.slice(1, 33)),
            y: bytesToBase64Url(publicKey.slice(33)),
          },
        },
      ],
      authentication: ['did:web:example.com#key-1'],
      assertionMethod: ['did:web:example.com#key-1'],
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
    });

    await expect(provider.verify(payload, signature, 'did:web:example.com')).resolves.toBe(true);
  });

  it('verify 在缺少 verification material 时 fail closed', async () => {
    mockedResolveDidWebDocument.mockResolvedValue({
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: 'did:web:example.com',
      verificationMethod: [
        {
          id: 'did:web:example.com#key-1',
          type: 'JsonWebKey2020',
          controller: 'did:web:example.com',
          publicKeyMultibase: '',
        },
      ],
      authentication: ['did:web:example.com#key-1'],
      assertionMethod: ['did:web:example.com#key-1'],
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
    });

    await expect(
      provider.verify(new Uint8Array([1]), new Uint8Array([2]), 'did:web:example.com')
    ).resolves.toBe(false);
  });
});
