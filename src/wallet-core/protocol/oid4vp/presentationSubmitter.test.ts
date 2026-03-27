import type { ProtocolContext } from '@/wallet-core/types/contracts';
import { submitPresentation } from './presentationSubmitter';

jest.mock('@/services/credentialRepository', () => ({
  credentialRepository: {
    getById: jest.fn(),
  },
}));

jest.mock('./keyBindingBuilder', () => ({
  buildKeyBindingJwt: jest.fn(),
}));

jest.mock('./presentationSessionStore', () => ({
  getPresentationRequest: jest.fn(),
  deletePresentationRequest: jest.fn(),
}));

const { credentialRepository } = jest.requireMock('@/services/credentialRepository') as {
  credentialRepository: {
    getById: jest.Mock;
  };
};
const { buildKeyBindingJwt } = jest.requireMock('./keyBindingBuilder') as {
  buildKeyBindingJwt: jest.Mock;
};
const sessionStore = jest.requireMock('./presentationSessionStore') as {
  getPresentationRequest: jest.Mock;
  deletePresentationRequest: jest.Mock;
};

describe('presentationSubmitter', () => {
  const selectDisclose = jest.fn();
  const ctx = {
    registry: {
      getCredentialFormat: jest.fn().mockReturnValue({
        selectDisclose,
      }),
    },
  } as unknown as ProtocolContext;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('在 session 不存在时返回错误', async () => {
    sessionStore.getPresentationRequest.mockReturnValue(undefined);

    const result = await submitPresentation('vp-1', ctx);

    expect(result).toEqual({
      type: 'error',
      message: 'Presentation request not found or already submitted.',
    });
  });

  it('在缺少 response_uri 时返回错误', async () => {
    sessionStore.getPresentationRequest.mockReturnValue({
      requestObject: {},
      matched: [],
      verifier: 'verifier.example',
    });

    const result = await submitPresentation('vp-1', ctx);

    expect(result).toEqual({
      type: 'error',
      message: 'response_uri missing in request object',
    });
  });

  it('在 response_mode 不支持时返回错误', async () => {
    sessionStore.getPresentationRequest.mockReturnValue({
      requestObject: {
        response_uri: 'https://verifier.example/direct_post',
        response_mode: 'fragment',
      },
      matched: [],
      verifier: 'verifier.example',
    });

    const result = await submitPresentation('vp-1', ctx);

    expect(result).toEqual({
      type: 'error',
      message: 'Unsupported response_mode: fragment',
    });
  });

  it('对 sd-jwt-vc 进行 disclosure 和 key binding 后提交 direct_post', async () => {
    sessionStore.getPresentationRequest.mockReturnValue({
      requestObject: {
        response_uri: 'https://verifier.example/direct_post',
        state: 'state-1',
        nonce: 'nonce-1',
        client_id: 'https://verifier.example',
      },
      matched: [
        {
          credential: {
            id: 'cred-1',
            _format: 'sd-jwt-vc',
          },
          disclosedClaims: ['given_name'],
          queryId: 'q1',
        },
      ],
      verifier: 'verifier.example',
    });
    credentialRepository.getById.mockReturnValue({
      raw: 'raw-credential',
    });
    selectDisclose.mockResolvedValue('disclosed-credential');
    buildKeyBindingJwt.mockResolvedValue('kb.jwt');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({ verified: true }),
    });

    const result = await submitPresentation('vp-1', ctx);

    expect(selectDisclose).toHaveBeenCalledWith('raw-credential', ['given_name']);
    expect(buildKeyBindingJwt).toHaveBeenCalledWith('disclosed-credential', {
      response_uri: 'https://verifier.example/direct_post',
      state: 'state-1',
      nonce: 'nonce-1',
      client_id: 'https://verifier.example',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://verifier.example/direct_post',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      })
    );
    const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
    expect(body).toContain('state=state-1');
    expect(decodeURIComponent(body)).toContain('"q1":["disclosed-credential~kb.jwt"]');
    expect(sessionStore.deletePresentationRequest).toHaveBeenCalledWith('vp-1');
    expect(result).toEqual({
      type: 'presentation_sent',
      verifier: 'verifier.example',
      verificationResult: { verified: true },
    });
  });

  it('在缺少 raw credential 时返回错误', async () => {
    sessionStore.getPresentationRequest.mockReturnValue({
      requestObject: {
        response_uri: 'https://verifier.example/direct_post',
      },
      matched: [
        {
          credential: {
            id: 'cred-1',
            _format: 'sd-jwt-vc',
          },
          disclosedClaims: [],
          queryId: 'q1',
        },
      ],
      verifier: 'verifier.example',
    });
    credentialRepository.getById.mockReturnValue(undefined);

    const result = await submitPresentation('vp-1', ctx);

    expect(result).toEqual({
      type: 'error',
      message: 'No raw credential token available for cred-1',
    });
  });

  it('在 verifier 返回非 2xx 时返回提交失败', async () => {
    sessionStore.getPresentationRequest.mockReturnValue({
      requestObject: {
        response_uri: 'https://verifier.example/direct_post',
      },
      matched: [
        {
          credential: {
            id: 'cred-1',
            _format: 'jwt_vc_json',
            _raw: 'inline-raw',
          },
          disclosedClaims: [],
          queryId: 'q1',
        },
      ],
      verifier: 'verifier.example',
    });
    credentialRepository.getById.mockReturnValue(undefined);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
    });

    const result = await submitPresentation('vp-1', ctx);

    expect(result).toEqual({
      type: 'error',
      message: 'VP submission failed (400)',
    });
  });
});
