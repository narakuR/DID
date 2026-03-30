import { buildCredentialRequestProof, resolveProofSigner } from './proofBuilder';

jest.mock('@/wallet-core/did/KeyManager', () => ({
  keyManager: {
    getCredentialProofKey: jest.fn(),
  },
}));

jest.mock('./client', () => ({
  oid4vciClient: {
    createCredentialRequestJwtProof: jest.fn(),
  },
}));

const { keyManager } = jest.requireMock('@/wallet-core/did/KeyManager') as {
  keyManager: {
    getCredentialProofKey: jest.Mock;
  };
};
const { oid4vciClient } = jest.requireMock('./client') as {
  oid4vciClient: {
    createCredentialRequestJwtProof: jest.Mock;
  };
};

describe('proofBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolveProofSigner 委托给 KeyManager', async () => {
    keyManager.getCredentialProofKey.mockResolvedValue({
      did: 'did:jwk:test',
      keyId: 'did:jwk:test#0',
      alg: 'ES256',
      method: 'did:jwk',
    });

    await expect(
      resolveProofSigner({ credentialConfigurationId: 'config-1' })
    ).resolves.toEqual({
      did: 'did:jwk:test',
      keyId: 'did:jwk:test#0',
      alg: 'ES256',
      method: 'did:jwk',
    });
  });

  it('buildCredentialRequestProof 将 KeyReference 映射为 did signer', async () => {
    keyManager.getCredentialProofKey.mockResolvedValue({
      did: 'did:key:test',
      keyId: 'did:key:test#z6',
      alg: 'EdDSA',
      method: 'did:key',
    });
    oid4vciClient.createCredentialRequestJwtProof.mockResolvedValue({ jwt: 'proof.jwt' });

    const result = await buildCredentialRequestProof({
      issuerMetadata: { credentialIssuer: 'https://issuer.example' } as never,
      credentialConfigurationId: 'config-1',
      nonce: 'nonce-1',
    });

    expect(oid4vciClient.createCredentialRequestJwtProof).toHaveBeenCalledWith({
      issuerMetadata: { credentialIssuer: 'https://issuer.example' },
      credentialConfigurationId: 'config-1',
      nonce: 'nonce-1',
      clientId: 'did:key:test',
      signer: {
        method: 'did',
        didUrl: 'did:key:test#z6',
        alg: 'EdDSA',
      },
    });
    expect(result).toEqual({ jwt: 'proof.jwt' });
  });

  it('buildCredentialRequestProof 将 binding method / alg 提示透传给 KeyManager', async () => {
    keyManager.getCredentialProofKey.mockResolvedValue({
      did: 'did:jwk:test',
      keyId: 'did:jwk:test#0',
      alg: 'ES256',
      method: 'did:jwk',
    });
    oid4vciClient.createCredentialRequestJwtProof.mockResolvedValue({ jwt: 'proof.jwt' });

    await buildCredentialRequestProof({
      issuerMetadata: { credentialIssuer: 'https://issuer.example' } as never,
      credentialConfigurationId: 'config-1',
      credentialFormat: 'sd-jwt-vc',
      nonce: 'nonce-1',
      bindingMethodsSupported: ['did:jwk'],
      proofSigningAlgValuesSupported: ['ES256'],
    });

    expect(keyManager.getCredentialProofKey).toHaveBeenCalledWith({
      credentialConfigurationId: 'config-1',
      credentialFormat: 'sd-jwt-vc',
      bindingMethodsSupported: ['did:jwk'],
      proofSigningAlgValuesSupported: ['ES256'],
    });
  });
});
