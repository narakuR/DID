import { signerFactory } from './SignerFactory';

jest.mock('@/wallet-core/did/DidJwkProvider', () => ({
  didJwkProvider: {
    asJwsSigner: jest.fn(),
  },
}));

jest.mock('@/wallet-core/did/DidKeyProvider', () => ({
  didKeyProvider: {
    asJwsSigner: jest.fn(),
  },
}));

const { didJwkProvider } = jest.requireMock('@/wallet-core/did/DidJwkProvider') as {
  didJwkProvider: {
    asJwsSigner: jest.Mock;
  };
};
const { didKeyProvider } = jest.requireMock('@/wallet-core/did/DidKeyProvider') as {
  didKeyProvider: {
    asJwsSigner: jest.Mock;
  };
};

describe('SignerFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('did:jwk 返回 ES256 signer', async () => {
    const sign = jest.fn();
    didJwkProvider.asJwsSigner.mockReturnValue({ alg: 'ES256', sign });

    const signer = signerFactory.createJwsSigner({
      did: 'did:jwk:test',
      keyId: 'did:jwk:test#0',
      alg: 'ES256',
      method: 'did:jwk',
    });

    expect(didJwkProvider.asJwsSigner).toHaveBeenCalledWith('did:jwk:test#0');
    expect(signer.alg).toBe('ES256');
    expect(signer.sign).toBe(sign);
  });

  it('did:key raw signer 委托到 EdDSA signer', async () => {
    const sign = jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
    didKeyProvider.asJwsSigner.mockReturnValue({ alg: 'EdDSA', sign });

    const rawSigner = signerFactory.createRawSigner({
      did: 'did:key:test',
      keyId: 'did:key:test#z6',
      alg: 'EdDSA',
      method: 'did:key',
    });

    await expect(rawSigner(new Uint8Array([9]))).resolves.toEqual(
      new Uint8Array([1, 2, 3])
    );
    expect(didKeyProvider.asJwsSigner).toHaveBeenCalledWith('did:key:test#z6');
  });
});
