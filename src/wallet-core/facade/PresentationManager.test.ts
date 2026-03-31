import type { ProtocolContext } from '@/wallet-core/types/contracts';
import { useDocumentKeyStore } from '@/wallet-core/domain/DocumentKeyStore';
import { PresentationManager } from './PresentationManager';

jest.mock('@/wallet-core/protocol/oid4vp/Oid4vpHandler', () => ({
  oid4vpHandler: {
    submitPresentation: jest.fn(),
  },
}));

const { oid4vpHandler } = jest.requireMock('@/wallet-core/protocol/oid4vp/Oid4vpHandler') as {
  oid4vpHandler: {
    submitPresentation: jest.Mock;
  };
};

describe('PresentationManager', () => {
  const credential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'cred-1',
    type: ['VerifiableCredential', 'EHIC'],
    issuer: {
      id: 'did:key:issuer',
      name: 'Issuer',
      type: 'GOVERNMENT',
    },
    issuanceDate: '2026-01-01T00:00:00.000Z',
    expirationDate: '2027-01-01T00:00:00.000Z',
    credentialSubject: {},
    status: 'active',
    visual: {
      title: 'EHIC',
      description: 'urn:eudi:ehic:1',
      gradientKey: 'green',
    },
  } as const;

  beforeEach(() => {
    jest.clearAllMocks();
    useDocumentKeyStore.setState({ bindings: {} });
  });

  it('presentation_request 时返回 presentation_requested session', async () => {
    const manager = new PresentationManager();
    const handler = {
      handle: jest.fn().mockResolvedValue({
        type: 'presentation_request',
        request: {
          verifier: 'verifier.example',
          presentationId: 'vp-1',
          matches: [
            {
              credential,
              disclosedClaims: ['given_name'],
              queryId: 'q1',
            },
          ],
        },
      }),
    };

    const result = await manager.handleWithHandler(
      handler as never,
      'openid4vp://?request=1',
      {} as ProtocolContext
    );

    expect(result.kind).toBe('presentation_requested');
    if (result.kind === 'presentation_requested') {
      expect(result.session.verifier).toBe('verifier.example');
      expect(result.session.matches[0]).toEqual(
        expect.objectContaining({
          queryId: 'q1',
          disclosedClaims: ['given_name'],
        })
      );
    }
  });

  it('submit 时返回 presentation_submitted session', async () => {
    const manager = new PresentationManager();
    oid4vpHandler.submitPresentation.mockResolvedValue({
      type: 'presentation_sent',
      verifier: 'verifier.example',
      verificationResult: { valid: true },
    });

    const result = await manager.submit('vp-1', {} as ProtocolContext);

    expect(oid4vpHandler.submitPresentation).toHaveBeenCalledWith(
      'vp-1',
      expect.any(Object)
    );
    expect(result).toEqual({
      kind: 'presentation_submitted',
      session: expect.objectContaining({
        presentationId: 'vp-1',
        verifier: 'verifier.example',
        status: 'submitted',
        verificationResult: { valid: true },
      }),
      protocolResult: {
        type: 'presentation_sent',
        verifier: 'verifier.example',
        verificationResult: { valid: true },
      },
    });
  });

  it('error 时返回 failure operation', async () => {
    const manager = new PresentationManager();
    const handler = {
      handle: jest.fn().mockResolvedValue({
        type: 'error',
        message: 'presentation failed',
      }),
    };

    const result = await manager.handleWithHandler(
      handler as never,
      'openid4vp://?request=1',
      {} as ProtocolContext
    );

    expect(result).toEqual({
      kind: 'failure',
      message: 'presentation failed',
      protocolResult: {
        type: 'error',
        message: 'presentation failed',
      },
    });
  });

  it('mdoc 请求会把文档级展示能力带入 presentation session', async () => {
    useDocumentKeyStore.setState({
      bindings: {
        'mdoc-1': {
          documentId: 'mdoc-1',
          format: 'mso_mdoc',
          docType: 'eu.europa.ec.eudi.pid.1',
          bindingType: 'document-device-key',
          strategy: 'linked-did-jwk',
          keyRef: 'document:mdoc-1:did:jwk:test#0',
          did: 'did:jwk:test',
          keyId: 'did:jwk:test#0',
          algorithm: 'ES256',
          state: 'ready',
          updatedAt: new Date().toISOString(),
        },
      },
    });

    const manager = new PresentationManager();
    const handler = {
      handle: jest.fn().mockResolvedValue({
        type: 'presentation_request',
        request: {
          verifier: 'verifier.example',
          presentationId: 'vp-mdoc',
          matches: [
            {
              credential: {
                ...credential,
                id: 'mdoc-1',
                type: ['VerifiableCredential', 'eu.europa.ec.eudi.pid.1'],
                visual: {
                  ...credential.visual,
                  description: 'eu.europa.ec.eudi.pid.1',
                },
                _format: 'mso_mdoc',
              },
              disclosedClaims: ['eu.europa.ec.eudi.pid.1.place_of_birth'],
              queryId: 'q-mdoc',
            },
          ],
        },
      }),
    };

    const result = await manager.handleWithHandler(
      handler as never,
      'openid4vp://?request=1',
      {} as ProtocolContext
    );

    expect(result.kind).toBe('presentation_requested');
    if (result.kind === 'presentation_requested') {
      expect(result.session.matches[0].document.presentationBinding.type).toBe(
        'document-device-key'
      );
      expect(
        result.session.matches[0].document.presentationCapabilities.remoteOid4vp
      ).toBe('supported');
    }
  });

  it('mdoc 不可展示时 submit 返回 failure operation', async () => {
    const manager = new PresentationManager();
    oid4vpHandler.submitPresentation.mockResolvedValue({
      type: 'error',
      message: 'This mdoc must be rebound or reissued on this device.',
    });

    const result = await manager.submit('vp-mdoc', {} as ProtocolContext);

    expect(result).toEqual({
      kind: 'failure',
      message: 'This mdoc must be rebound or reissued on this device.',
      protocolResult: {
        type: 'error',
        message: 'This mdoc must be rebound or reissued on this device.',
      },
    });
  });
});
