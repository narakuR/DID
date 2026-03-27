jest.mock('@/wallet-core/did/DidKeyProvider', () => ({
  didKeyProvider: {
    getStoredMetadata: jest.fn(),
  },
}));

jest.mock('@/wallet-core/registry/walletRegistry', () => ({
  walletRegistry: {
    routeProtocol: jest.fn(),
  },
}));

jest.mock('./IssuanceManager', () => ({
  IssuanceManager: jest.fn().mockImplementation(() => ({
    handleWithHandler: jest.fn(),
  })),
}));

jest.mock('./PresentationManager', () => ({
  PresentationManager: jest.fn().mockImplementation(() => ({
    handleWithHandler: jest.fn(),
    submit: jest.fn(),
  })),
}));

import { WalletCore } from './WalletCore';

const { didKeyProvider } = jest.requireMock('@/wallet-core/did/DidKeyProvider') as {
  didKeyProvider: {
    getStoredMetadata: jest.Mock;
  };
};
const { walletRegistry } = jest.requireMock('@/wallet-core/registry/walletRegistry') as {
  walletRegistry: {
    routeProtocol: jest.Mock;
  };
};
const { IssuanceManager } = jest.requireMock('./IssuanceManager') as {
  IssuanceManager: jest.Mock;
};
const { PresentationManager } = jest.requireMock('./PresentationManager') as {
  PresentationManager: jest.Mock;
};

describe('WalletCore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createWalletCore() {
    return new WalletCore({
      loadState: async () => ({
        credentials: [],
        activeDid: '',
      }),
      persistence: {
        saveIssuedCredential: jest.fn(),
        addDisplayCredential: jest.fn(),
      },
    });
  }

  function getIssuanceManagerMock() {
    return IssuanceManager.mock.results.at(-1)?.value as {
      handleWithHandler: jest.Mock;
    };
  }

  function getPresentationManagerMock() {
    return PresentationManager.mock.results.at(-1)?.value as {
      handleWithHandler: jest.Mock;
      submit: jest.Mock;
    };
  }

  it('buildProtocolContext 优先使用 loadState 的 credentials，并从 did provider 补 activeDid', async () => {
    didKeyProvider.getStoredMetadata.mockResolvedValue({
      did: 'did:key:active',
    });

    const walletCore = createWalletCore();
    const ctx = await walletCore.buildProtocolContext();

    expect(ctx.activeDid).toBe('did:key:active');
    expect(ctx.credentials).toEqual([]);
  });

  it('无 handler 时返回 failure operation', async () => {
    walletRegistry.routeProtocol.mockReturnValue(null);
    const walletCore = createWalletCore();

    const result = await walletCore.handleUriOperation('unknown://uri');

    expect(result).toEqual({
      kind: 'failure',
      message: 'No handler registered for URI: unknown://uri',
      protocolResult: {
        type: 'error',
        message: 'No handler registered for URI: unknown://uri',
      },
    });
  });

  it('OID4VCI handler 走 issuance manager 路径', async () => {
    const walletCore = createWalletCore();
    const issuance = getIssuanceManagerMock();
    issuance.handleWithHandler.mockResolvedValue({
      kind: 'issuance_redirect',
      session: {
        id: 'issuance-1',
        uri: 'openid-credential-offer://?x=1',
        status: 'redirect_required',
        redirectUrl: 'https://issuer.example/auth',
        documents: [],
      },
      protocolResult: {
        type: 'redirect',
        url: 'https://issuer.example/auth',
      },
    });

    walletRegistry.routeProtocol.mockReturnValue({
      scheme: 'openid-credential-offer',
      handle: jest.fn(),
    });

    const result = await walletCore.handleUriOperation('openid-credential-offer://?x=1');

    expect(issuance.handleWithHandler).toHaveBeenCalled();
    expect(result.kind).toBe('issuance_redirect');
  });

  it('OID4VP handler 走 presentation manager 路径', async () => {
    const walletCore = createWalletCore();
    const presentation = getPresentationManagerMock();
    presentation.handleWithHandler.mockResolvedValue({
      kind: 'presentation_requested',
      session: {
        id: 'presentation-1',
        presentationId: 'vp-1',
        verifier: 'verifier.example',
        status: 'requested',
        matches: [],
      },
      protocolResult: {
        type: 'presentation_request',
        request: {
          verifier: 'verifier.example',
          presentationId: 'vp-1',
          matches: [],
        },
      },
    });

    walletRegistry.routeProtocol.mockReturnValue({
      scheme: 'openid4vp',
      handle: jest.fn(),
    });

    const result = await walletCore.handleUriOperation('openid4vp://?request=1');

    expect(presentation.handleWithHandler).toHaveBeenCalled();
    expect(result.kind).toBe('presentation_requested');
  });

  it('submitPresentationOperation 委托给 presentation manager', async () => {
    const walletCore = createWalletCore();
    const presentation = getPresentationManagerMock();
    presentation.submit.mockResolvedValue({
      kind: 'presentation_submitted',
      session: {
        id: 'presentation-1',
        presentationId: 'vp-1',
        verifier: 'verifier.example',
        status: 'submitted',
        matches: [],
      },
      protocolResult: {
        type: 'presentation_sent',
        verifier: 'verifier.example',
      },
    });

    const result = await walletCore.submitPresentationOperation('vp-1');

    expect(presentation.submit).toHaveBeenCalledWith('vp-1', expect.any(Object));
    expect(result.kind).toBe('presentation_submitted');
  });
});
