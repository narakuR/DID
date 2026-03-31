const mockSessionTranscriptForOid4Vp = jest.fn();
const mockDeviceSignedSign = jest.fn();
const mockDocumentCreate = jest.fn();
const mockDeviceResponseCreateSimple = jest.fn();
const mockParseIssuerSignedFromRawMdoc = jest.fn();
const mockCoseKeyFromJwk = jest.fn();

jest.mock('@noble/curves/nist.js', () => ({
  p256: {
    sign: jest.fn(() => new Uint8Array([1, 2, 3])),
    verify: jest.fn(() => true),
  },
}));

jest.mock('@noble/hashes/sha2.js', () => ({
  sha256: jest.fn((bytes: Uint8Array) => bytes),
  sha384: jest.fn((bytes: Uint8Array) => bytes),
  sha512: jest.fn((bytes: Uint8Array) => bytes),
}));

jest.mock('@owf/mdoc', () => {
  class MockIssuerNamespaces {
    issuerNamespaces: Map<string, unknown>;

    constructor(options: { issuerNamespaces: Map<string, unknown> }) {
      this.issuerNamespaces = options.issuerNamespaces;
    }

    static create(options: { issuerNamespaces: Map<string, unknown> }) {
      return new MockIssuerNamespaces(options);
    }
  }

  class MockIssuerSigned {
    issuerAuth: { mobileSecurityObject: { docType: string } };
    issuerNamespaces: MockIssuerNamespaces;
    private readonly namespaces: Map<string, { elementIdentifier: string }[]>;

    constructor(options: {
      issuerAuth: { mobileSecurityObject: { docType: string } };
      issuerNamespaces?: MockIssuerNamespaces;
      namespaces?: Map<string, { elementIdentifier: string }[]>;
    }) {
      this.issuerAuth = options.issuerAuth;
      this.issuerNamespaces =
        options.issuerNamespaces ?? new MockIssuerNamespaces({ issuerNamespaces: new Map() });
      this.namespaces =
        options.namespaces ??
        new Map(
          Array.from(this.issuerNamespaces.issuerNamespaces.entries()) as Array<
            [string, { elementIdentifier: string }[]]
          >
        );
    }

    getIssuerNamespace(namespace: string) {
      return this.namespaces.get(namespace);
    }

    static create(options: {
      issuerAuth: { mobileSecurityObject: { docType: string } };
      issuerNamespaces: MockIssuerNamespaces;
    }) {
      return new MockIssuerSigned({
        issuerAuth: options.issuerAuth,
        issuerNamespaces: options.issuerNamespaces,
      });
    }
  }

  return {
    CoseKey: {
      fromJwk: mockCoseKeyFromJwk,
    },
    Curve: {
      'P-256': 'P-256',
    },
    DeviceResponse: {
      createSimple: mockDeviceResponseCreateSimple,
    },
    DeviceSignedBuilder: jest.fn().mockImplementation(() => ({
      sign: mockDeviceSignedSign,
    })),
    Document: {
      create: mockDocumentCreate,
    },
    IssuerNamespaces: MockIssuerNamespaces,
    IssuerSigned: MockIssuerSigned,
    KeyType: {
      Ec: 'EC',
    },
    SessionTranscript: {
      forOid4Vp: mockSessionTranscriptForOid4Vp,
    },
    SignatureAlgorithm: {
      ES256: 'ES256',
    },
  };
});

jest.mock('@/wallet-core/domain/DocumentKeyStore', () => ({
  exportPrivateJwkForBinding: jest.fn(),
}));

jest.mock('@/wallet-core/formats/MdocFormat', () => ({
  parseIssuerSignedFromRawMdoc: (...args: unknown[]) =>
    mockParseIssuerSignedFromRawMdoc(...args),
}));

import { buildMdocRemotePresentation } from './mdocRemotePresentation';

const { exportPrivateJwkForBinding } = jest.requireMock(
  '@/wallet-core/domain/DocumentKeyStore'
) as {
  exportPrivateJwkForBinding: jest.Mock;
};

describe('mdocRemotePresentation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionTranscriptForOid4Vp.mockResolvedValue({ transcript: 'session' });
    mockCoseKeyFromJwk.mockReturnValue({ keyId: 'did:jwk:test#0' });
    mockDeviceSignedSign.mockResolvedValue({ deviceSigned: true });
    mockDocumentCreate.mockImplementation((options) => ({
      ...options,
    }));
    mockDeviceResponseCreateSimple.mockReturnValue({
      encodedForOid4Vp: 'encoded-device-response',
    });
    mockParseIssuerSignedFromRawMdoc.mockReturnValue({
      issuerAuth: {
        mobileSecurityObject: {
          docType: 'eu.europa.ec.eudi.pid.1',
        },
      },
      getIssuerNamespace: (namespace: string) =>
        namespace === 'eu.europa.ec.eudi.pid.1'
          ? [
              { elementIdentifier: 'given_name' },
              { elementIdentifier: 'place_of_birth' },
            ]
          : undefined,
    });
  });

  it('使用文档级 binding 构造 mdoc DeviceResponse', async () => {
    exportPrivateJwkForBinding.mockResolvedValue({
      kty: 'EC',
      crv: 'P-256',
      x: 'x',
      y: 'y',
      d: 'd',
    });

    const vpToken = await buildMdocRemotePresentation({
      credential: {
        id: 'cred-1',
        _format: 'mso_mdoc',
      } as never,
      rawCredential: 'raw-mdoc',
      binding: {
        documentId: 'cred-1',
        format: 'mso_mdoc',
        docType: 'eu.europa.ec.eudi.pid.1',
        bindingType: 'document-device-key',
        strategy: 'stored-document-jwk',
        keyRef: 'document:cred-1:did:jwk:test#0',
        keyId: 'did:jwk:test#0',
        algorithm: 'ES256',
        state: 'ready',
        updatedAt: new Date().toISOString(),
      },
      requestObject: {
        client_id: 'https://verifier.example',
        nonce: 'nonce-1',
        response_uri: 'https://verifier.example/direct_post',
      },
      requestedClaims: [{ path: ['eu.europa.ec.eudi.pid.1', 'place_of_birth'] }],
      docType: 'eu.europa.ec.eudi.pid.1',
    });

    expect(mockSessionTranscriptForOid4Vp).toHaveBeenCalledWith(
      {
        clientId: 'https://verifier.example',
        nonce: 'nonce-1',
        responseUri: 'https://verifier.example/direct_post',
      },
      expect.any(Object)
    );
    expect(mockCoseKeyFromJwk).toHaveBeenCalledWith({
      kty: 'EC',
      crv: 'P-256',
      x: 'x',
      y: 'y',
      d: 'd',
      kid: 'did:jwk:test#0',
      alg: 'ES256',
    });
    expect(mockDeviceSignedSign).toHaveBeenCalledWith(
      expect.objectContaining({
        algorithm: 'ES256',
        derCertificate: '',
        sessionTranscript: { transcript: 'session' },
      })
    );
    expect(mockDocumentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        docType: 'eu.europa.ec.eudi.pid.1',
      })
    );
    expect(mockDeviceResponseCreateSimple).toHaveBeenCalledWith({
      documents: [
        expect.objectContaining({
          docType: 'eu.europa.ec.eudi.pid.1',
        }),
      ],
      status: 0,
    });
    expect(vpToken).toBe('encoded-device-response');
  });

  it('在文档级 key 未就绪时返回产品态错误', async () => {
    await expect(
      buildMdocRemotePresentation({
        credential: {
          id: 'cred-1',
          _format: 'mso_mdoc',
        } as never,
        rawCredential: 'raw-mdoc',
        binding: {
          documentId: 'cred-1',
          format: 'mso_mdoc',
          docType: 'eu.europa.ec.eudi.pid.1',
          bindingType: 'document-device-key',
          strategy: 'stored-document-jwk',
          keyRef: 'document:cred-1:missing',
          algorithm: 'ES256',
          state: 'missing_device_key',
          reason: 'This mdoc must be rebound or reissued on this device.',
          updatedAt: new Date().toISOString(),
        },
        requestObject: {
          client_id: 'https://verifier.example',
          nonce: 'nonce-1',
          response_uri: 'https://verifier.example/direct_post',
        },
        requestedClaims: [],
        docType: 'eu.europa.ec.eudi.pid.1',
      })
    ).rejects.toThrow('This mdoc must be rebound or reissued on this device.');
  });
});
