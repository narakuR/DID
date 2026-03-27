import type { ProtocolContext } from '@/wallet-core/types/contracts';
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
});
