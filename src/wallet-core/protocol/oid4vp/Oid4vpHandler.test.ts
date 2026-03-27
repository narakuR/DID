import type { ProtocolContext } from '@/wallet-core/types/contracts';
import { Oid4vpHandler } from './Oid4vpHandler';

jest.mock('./requestObjectResolver', () => ({
  extractVerifierName: jest.fn(),
  fetchRequestObjectJwt: jest.fn(),
  parseOpenid4vpUri: jest.fn(),
  parseRequestObjectJwt: jest.fn(),
}));

jest.mock('./dcqlMatcher', () => ({
  selectMatches: jest.fn(),
}));

jest.mock('./presentationSessionStore', () => ({
  createPresentationId: jest.fn(),
  savePresentationRequest: jest.fn(),
}));

jest.mock('./presentationSubmitter', () => ({
  submitPresentation: jest.fn(),
}));

const resolver = jest.requireMock('./requestObjectResolver') as {
  extractVerifierName: jest.Mock;
  fetchRequestObjectJwt: jest.Mock;
  parseOpenid4vpUri: jest.Mock;
  parseRequestObjectJwt: jest.Mock;
};
const matcher = jest.requireMock('./dcqlMatcher') as {
  selectMatches: jest.Mock;
};
const sessionStore = jest.requireMock('./presentationSessionStore') as {
  createPresentationId: jest.Mock;
  savePresentationRequest: jest.Mock;
};
const submitter = jest.requireMock('./presentationSubmitter') as {
  submitPresentation: jest.Mock;
};

describe('Oid4vpHandler', () => {
  const handler = new Oid4vpHandler();
  const ctx = {
    registry: {
      getCredentialFormat: jest.fn(),
      getDIDProvider: jest.fn(),
      routeProtocol: jest.fn(),
      setStorageBackend: jest.fn(),
      registerDIDProvider: jest.fn(),
      registerCredentialFormat: jest.fn(),
      registerProtocolHandler: jest.fn(),
      storage: {} as never,
    },
    credentials: [{ id: 'cred-1', type: ['VerifiableCredential', 'EHIC'] }],
    activeDid: 'did:key:test',
  } as unknown as ProtocolContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('在没有 request object 时返回错误', async () => {
    resolver.parseOpenid4vpUri.mockReturnValue({});

    const result = await handler.handle('openid4vp://?foo=bar', ctx);

    expect(result).toEqual({
      type: 'error',
      message: 'OID4VP request object is missing',
    });
  });

  it('在存在匹配凭证时保存 session 并返回 presentation_request', async () => {
    resolver.parseOpenid4vpUri.mockReturnValue({
      requestJwt: 'jwt-here',
    });
    resolver.parseRequestObjectJwt.mockReturnValue({
      client_id: 'https://verifier.example',
    });
    resolver.extractVerifierName.mockReturnValue('verifier.example');
    matcher.selectMatches.mockReturnValue([
      {
        credential: { id: 'cred-1', type: ['VerifiableCredential', 'EHIC'] },
        disclosedClaims: ['given_name'],
        queryId: 'cred_1',
      },
    ]);
    sessionStore.createPresentationId.mockReturnValue('vp-123');

    const result = await handler.handle('openid4vp://?request=jwt-here', ctx);

    expect(sessionStore.savePresentationRequest).toHaveBeenCalledWith('vp-123', {
      requestObject: { client_id: 'https://verifier.example' },
      matched: [
        {
          credential: { id: 'cred-1', type: ['VerifiableCredential', 'EHIC'] },
          disclosedClaims: ['given_name'],
          queryId: 'cred_1',
        },
      ],
      verifier: 'verifier.example',
    });
    expect(result).toEqual({
      type: 'presentation_request',
      request: {
        verifier: 'verifier.example',
        presentationId: 'vp-123',
        matches: [
          {
            credential: { id: 'cred-1', type: ['VerifiableCredential', 'EHIC'] },
            disclosedClaims: ['given_name'],
            queryId: 'cred_1',
          },
        ],
      },
    });
  });

  it('在没有匹配凭证时返回错误', async () => {
    resolver.parseOpenid4vpUri.mockReturnValue({
      requestJwt: 'jwt-here',
    });
    resolver.parseRequestObjectJwt.mockReturnValue({
      client_id: 'https://verifier.example',
    });
    resolver.extractVerifierName.mockReturnValue('verifier.example');
    matcher.selectMatches.mockReturnValue([]);

    const result = await handler.handle('openid4vp://?request=jwt-here', ctx);

    expect(result).toEqual({
      type: 'error',
      message: 'No matching credentials found for this presentation request.',
    });
  });

  it('submitPresentation 直接委托给 presentationSubmitter', async () => {
    submitter.submitPresentation.mockResolvedValue({
      type: 'presentation_sent',
      verifier: 'verifier.example',
    });

    const result = await handler.submitPresentation('vp-123', ctx);

    expect(submitter.submitPresentation).toHaveBeenCalledWith('vp-123', ctx);
    expect(result).toEqual({
      type: 'presentation_sent',
      verifier: 'verifier.example',
    });
  });
});
