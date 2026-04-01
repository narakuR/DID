import * as SecureStore from 'expo-secure-store';
import * as ExpoCrypto from 'expo-crypto';

import { didJwkProvider } from '@/wallet-core/did/DidJwkProvider';
import { storageService } from '@/services/storageService';

jest.mock('@/services/storageService', () => ({
  storageService: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    multiGet: jest.fn(),
  },
}));

const mockedStorageService = storageService as jest.Mocked<typeof storageService>;
const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockedExpoCrypto = ExpoCrypto as jest.Mocked<typeof ExpoCrypto>;

describe('DidJwkProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedStorageService.getItem.mockResolvedValue(null);
    mockedStorageService.setItem.mockResolvedValue();
  });

  it('create 使用抽离后的 method rules 生成 did:jwk 文档并持久化 metadata', async () => {
    const seed = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
    mockedExpoCrypto.getRandomBytes.mockReturnValue(seed);

    const result = await didJwkProvider.create();

    expect(result.did).toMatch(/^did:jwk:/);
    expect(result.keyId).toBe(`${result.did}#0`);
    expect(result.didDocument.id).toBe(result.did);
    expect(result.didDocument.verificationMethod[0].publicKeyJwk).toMatchObject({
      kty: 'EC',
      crv: 'P-256',
    });
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    expect(mockedStorageService.setItem).toHaveBeenCalledWith(
      'did_jwk_metadata',
      expect.objectContaining({
        did: result.did,
        keyId: result.keyId,
        method: 'did:jwk',
      })
    );
  });

  it('resolve 使用抽离后的 rules 从 did:jwk 恢复 DID document', async () => {
    const seed = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
    mockedExpoCrypto.getRandomBytes.mockReturnValue(seed);
    const created = await didJwkProvider.create();

    const resolved = await didJwkProvider.resolve(created.did);

    expect(resolved.id).toBe(created.did);
    expect(resolved.verificationMethod[0].id).toBe(`${created.did}#0`);
    expect(resolved.verificationMethod[0].publicKeyJwk).toMatchObject({
      kty: 'EC',
      crv: 'P-256',
    });
  });

  it('verify 保持基于 publicKeyJwk 的验签行为', async () => {
    const seed = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
    mockedExpoCrypto.getRandomBytes.mockReturnValue(seed);
    const created = await didJwkProvider.create();

    mockedSecureStore.getItemAsync.mockResolvedValue(
      Buffer.from(seed)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
    );

    const payload = new Uint8Array([1, 2, 3, 4]);
    const signature = await didJwkProvider.sign(payload, created.keyId);

    await expect(didJwkProvider.verify(payload, signature, created.did)).resolves.toBe(true);
  });

  it('exportPrivateJwk 保持返回完整 P-256 私钥 JWK', async () => {
    const seed = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
    mockedSecureStore.getItemAsync.mockResolvedValue(
      Buffer.from(seed)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
    );

    const jwk = await didJwkProvider.exportPrivateJwk();

    expect(jwk).toMatchObject({
      kty: 'EC',
      crv: 'P-256',
    });
    expect(jwk.d).toBeDefined();
  });
});
