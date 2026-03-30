import { keyManager } from './KeyManager';
import { INTEGRATION_CONFIG } from '@/config/integration';

jest.mock('@/wallet-core/did/DidJwkProvider', () => ({
  didJwkProvider: {
    getStoredMetadata: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('@/wallet-core/did/DidKeyProvider', () => ({
  didKeyProvider: {
    getStoredMetadata: jest.fn(),
  },
}));

const { didJwkProvider } = jest.requireMock('@/wallet-core/did/DidJwkProvider') as {
  didJwkProvider: {
    getStoredMetadata: jest.Mock;
    create: jest.Mock;
  };
};
const { didKeyProvider } = jest.requireMock('@/wallet-core/did/DidKeyProvider') as {
  didKeyProvider: {
    getStoredMetadata: jest.Mock;
  };
};

describe('KeyManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('EHIC 发证 proof 默认选择 did:jwk / ES256', async () => {
    didJwkProvider.getStoredMetadata.mockResolvedValue({
      did: 'did:jwk:test',
      keyId: 'did:jwk:test#0',
    });

    const key = await keyManager.getCredentialProofKey({
      credentialConfigurationId:
        INTEGRATION_CONFIG.credentials.ehic.credentialConfigurationId,
    });

    expect(key).toEqual({
      did: 'did:jwk:test',
      keyId: 'did:jwk:test#0',
      alg: 'ES256',
      method: 'did:jwk',
    });
  });

  it('缺少 did:jwk 时会自动创建', async () => {
    didJwkProvider.getStoredMetadata.mockResolvedValue(null);
    didJwkProvider.create.mockResolvedValue({
      metadata: {
        did: 'did:jwk:new',
        keyId: 'did:jwk:new#0',
      },
    });

    const key = await keyManager.getCredentialProofKey({
      credentialConfigurationId:
        INTEGRATION_CONFIG.credentials.ehic.credentialConfigurationId,
    });

    expect(didJwkProvider.create).toHaveBeenCalled();
    expect(key.did).toBe('did:jwk:new');
    expect(key.alg).toBe('ES256');
  });

  it('非 EHIC 发证 proof 选择 did:key / EdDSA', async () => {
    didKeyProvider.getStoredMetadata.mockResolvedValue({
      did: 'did:key:test',
      keyId: 'did:key:test#z6',
    });

    const key = await keyManager.getCredentialProofKey({
      credentialConfigurationId: 'pid-config',
    });

    expect(key).toEqual({
      did: 'did:key:test',
      keyId: 'did:key:test#z6',
      alg: 'EdDSA',
      method: 'did:key',
    });
  });

  it('缺少 did:key 时发证 proof 抛错', async () => {
    didKeyProvider.getStoredMetadata.mockResolvedValue(null);

    await expect(
      keyManager.getCredentialProofKey({
        credentialConfigurationId: 'pid-config',
      })
    ).rejects.toThrow('No active DID found. Please finish wallet setup first.');
  });

  it('metadata 支持 ES256 + did:jwk 时优先选择 did:jwk', async () => {
    didJwkProvider.getStoredMetadata.mockResolvedValue({
      did: 'did:jwk:test',
      keyId: 'did:jwk:test#0',
    });

    const key = await keyManager.getCredentialProofKey({
      credentialConfigurationId: 'config-1',
      bindingMethodsSupported: ['did:jwk', 'did:key'],
      proofSigningAlgValuesSupported: ['ES256', 'EdDSA'],
    });

    expect(key.method).toBe('did:jwk');
    expect(key.alg).toBe('ES256');
  });

  it('mso_mdoc 在缺少 proof alg 提示时默认回退到 did:jwk / ES256', async () => {
    didJwkProvider.getStoredMetadata.mockResolvedValue({
      did: 'did:jwk:test',
      keyId: 'did:jwk:test#0',
    });

    const key = await keyManager.getCredentialProofKey({
      credentialConfigurationId: 'eu.europa.ec.eudi_mso_mdoc',
      credentialFormat: 'mso_mdoc',
    });

    expect(key.method).toBe('did:jwk');
    expect(key.alg).toBe('ES256');
  });

  it('mso_mdoc 即使 metadata 未声明 did:jwk 也优先尝试 did:jwk / ES256', async () => {
    didJwkProvider.getStoredMetadata.mockResolvedValue({
      did: 'did:jwk:test',
      keyId: 'did:jwk:test#0',
    });

    const key = await keyManager.getCredentialProofKey({
      credentialConfigurationId: 'eu.europa.ec.eudi_mso_mdoc',
      credentialFormat: 'mso_mdoc',
      bindingMethodsSupported: ['cose_key'],
      proofSigningAlgValuesSupported: ['ES256'],
    });

    expect(key.method).toBe('did:jwk');
    expect(key.alg).toBe('ES256');
  });

  it('P-256 cnf 的 key binding 选择 did:jwk / ES256', async () => {
    didJwkProvider.getStoredMetadata.mockResolvedValue({
      did: 'did:jwk:test',
      keyId: 'did:jwk:test#0',
    });

    const key = await keyManager.getSdJwtKeyBindingKey({
      cnf: { jwk: { kty: 'EC', crv: 'P-256' } },
    });

    expect(key.alg).toBe('ES256');
    expect(key.method).toBe('did:jwk');
  });

  it('缺少 did:jwk key binding 密钥时抛错', async () => {
    didJwkProvider.getStoredMetadata.mockResolvedValue(null);

    await expect(
      keyManager.getSdJwtKeyBindingKey({
        cnf: { jwk: { kty: 'EC', crv: 'P-256' } },
      })
    ).rejects.toThrow('Missing DID:JWK key required for SD-JWT key binding');
  });

  it('非 P-256 cnf 的 key binding 选择 did:key / EdDSA', async () => {
    didKeyProvider.getStoredMetadata.mockResolvedValue({
      did: 'did:key:test',
      keyId: 'did:key:test#z6',
    });

    const key = await keyManager.getSdJwtKeyBindingKey({
      cnf: { jwk: { kty: 'OKP', crv: 'Ed25519' } },
    });

    expect(key.alg).toBe('EdDSA');
    expect(key.method).toBe('did:key');
  });
});
