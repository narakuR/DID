import * as SecureStore from 'expo-secure-store';
import * as ExpoCrypto from 'expo-crypto';

import { didKeyProvider } from '@/wallet-core/did/DidKeyProvider';
import { storageService } from '@/services/storageService';
import { STORAGE_KEYS } from '@/constants/config';

jest.mock('@/services/storageService', () => ({
  storageService: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    multiGet: jest.fn(),
  },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => false),
  shareAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/tmp/',
  writeAsStringAsync: jest.fn(),
  EncodingType: {
    UTF8: 'utf8',
  },
}));

const mockedStorageService = storageService as jest.Mocked<typeof storageService>;
const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockedExpoCrypto = ExpoCrypto as jest.Mocked<typeof ExpoCrypto>;

function bytesToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

describe('DidKeyProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedStorageService.getItem.mockResolvedValue(null);
    mockedStorageService.setItem.mockResolvedValue();
  });

  it('使用库规则创建 did:key 文档并持久化 metadata/document', async () => {
    const seed = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
    mockedExpoCrypto.getRandomBytes.mockReturnValue(seed);

    const result = await didKeyProvider.create();

    expect(result.did).toMatch(/^did:key:z/);
    expect(result.keyId).toBe(`${result.did}#${result.metadata.publicKeyMultibase}`);
    expect(result.metadata.method).toBe('did:key');
    expect(result.didDocument.id).toBe(result.did);
    expect(result.didDocument.verificationMethod[0].publicKeyMultibase).toBe(
      result.metadata.publicKeyMultibase
    );
    expect(result.didDocument.authentication).toEqual([result.keyId]);
    expect(result.didDocument.assertionMethod).toEqual([result.keyId]);
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    expect(mockedStorageService.setItem).toHaveBeenCalledWith(STORAGE_KEYS.DID_METADATA, result.metadata);
    expect(mockedStorageService.setItem).toHaveBeenCalledWith(STORAGE_KEYS.DID_DOCUMENT, result.didDocument);
  });

  it('resolve 优先命中已缓存 DID document', async () => {
    const didDocument = {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: 'did:key:zcached',
      verificationMethod: [
        {
          id: 'did:key:zcached#zcached',
          type: 'Ed25519VerificationKey2020' as const,
          controller: 'did:key:zcached',
          publicKeyMultibase: 'zcached',
        },
      ],
      authentication: ['did:key:zcached#zcached'],
      assertionMethod: ['did:key:zcached#zcached'],
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
    };
    mockedStorageService.getItem.mockResolvedValueOnce(didDocument);

    const resolved = await didKeyProvider.resolve('did:key:zcached');

    expect(resolved).toBe(didDocument);
  });

  it('sign/verify 与现有接口保持兼容', async () => {
    const seed = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
    mockedExpoCrypto.getRandomBytes.mockReturnValue(seed);

    const created = await didKeyProvider.create();
    mockedSecureStore.getItemAsync.mockResolvedValue(bytesToBase64Url(seed));

    const payload = new Uint8Array([1, 2, 3, 4]);
    const signature = await didKeyProvider.sign(payload, created.keyId);
    const verified = await didKeyProvider.verify(payload, signature, created.did);

    expect(signature).toBeInstanceOf(Uint8Array);
    expect(verified).toBe(true);

    const jwsSigner = didKeyProvider.asJwsSigner(created.keyId);
    expect(jwsSigner.alg).toBe('EdDSA');
    await expect(jwsSigner.sign(payload)).resolves.toBeInstanceOf(Uint8Array);
  });
});
