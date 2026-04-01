import * as SecureStore from 'expo-secure-store';
import * as ExpoCrypto from 'expo-crypto';

import { storageService } from '@/services/storageService';
import { useDocumentKeyStore } from './DocumentKeyStore';

jest.mock('@/services/storageService', () => ({
  storageService: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('@/wallet-core/formats/MdocFormat', () => ({
  extractDevicePublicJwkFromRawMdoc: jest.fn(),
}));

const mockedStorageService = storageService as jest.Mocked<typeof storageService>;
const mockedExtractDevicePublicJwkFromRawMdoc =
  jest.requireMock('@/wallet-core/formats/MdocFormat')
    .extractDevicePublicJwkFromRawMdoc as jest.Mock;

describe('DocumentKeyStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedStorageService.getItem.mockResolvedValue(null);
    mockedStorageService.setItem.mockResolvedValue();
    mockedStorageService.removeItem.mockResolvedValue();
    useDocumentKeyStore.setState({ bindings: {}, pendingBindings: {} });
  });

  it('issued mdoc device key 与 pending key 不一致时标记为 reissuance_required', async () => {
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (ExpoCrypto.getRandomBytes as jest.Mock).mockImplementation((length: number) =>
      new Uint8Array(Array.from({ length }, (_, index) => index + 1))
    );

    const { pendingBindingId } =
      await useDocumentKeyStore.getState().createPendingMdocBinding({
        docType: 'eu.europa.ec.eudi.pid.1',
      });

    mockedExtractDevicePublicJwkFromRawMdoc.mockReturnValue({
      kty: 'EC',
      crv: 'P-256',
      x: 'different-x',
      y: 'different-y',
    });

    await useDocumentKeyStore
      .getState()
      .finalizePendingMdocBinding(pendingBindingId, [
        {
          '@context': ['https://www.w3.org/2018/credentials/v1'],
          id: 'mdoc-1',
          type: ['VerifiableCredential', 'eu.europa.ec.eudi.pid.1'],
          issuer: {
            id: 'x509',
            name: 'mdoc Issuer',
            type: 'GOVERNMENT',
          },
          issuanceDate: '2026-01-01T00:00:00.000Z',
          expirationDate: '2027-01-01T00:00:00.000Z',
          credentialSubject: {},
          status: 'active',
          visual: {
            title: 'Personal ID (PID)',
            description: 'eu.europa.ec.eudi.pid.1',
            gradientKey: 'eu',
          },
          _raw: 'mdoc-raw',
          _format: 'mso_mdoc',
        },
      ] as never);

    const binding = useDocumentKeyStore.getState().bindings['mdoc-1'];
    expect(binding?.state).toBe('reissuance_required');
    expect(binding?.reason).toContain('does not match');
  });
});
