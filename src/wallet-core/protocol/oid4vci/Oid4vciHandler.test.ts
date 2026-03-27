import type { ProtocolContext } from '@/wallet-core/types/contracts';
import { Oid4vciHandler } from './Oid4vciHandler';

jest.mock('./client', () => ({
  oid4vciClient: {
    resolveIssuerMetadata: jest.fn(),
    retrievePreAuthorizedCodeAccessTokenFromOffer: jest.fn(),
    requestNonce: jest.fn(),
  },
}));

jest.mock('./offerResolver', () => ({
  resolveCredentialOffer: jest.fn(),
  resolveCredentialConfigId: jest.fn(),
  isOid4vciCallback: jest.fn(),
}));

jest.mock('./authFlow', () => ({
  startAuthorizationCodeFlow: jest.fn(),
  finishAuthorizationCodeFlow: jest.fn(),
}));

jest.mock('./proofBuilder', () => ({
  buildCredentialRequestProof: jest.fn(),
}));

jest.mock('./credentialMapper', () => ({
  requestCredentialWithIssuerCompat: jest.fn(),
  toCredentialReceivedResult: jest.fn(),
}));

const { oid4vciClient } = jest.requireMock('./client') as {
  oid4vciClient: {
    resolveIssuerMetadata: jest.Mock;
    retrievePreAuthorizedCodeAccessTokenFromOffer: jest.Mock;
    requestNonce: jest.Mock;
  };
};
const offerResolver = jest.requireMock('./offerResolver') as {
  resolveCredentialOffer: jest.Mock;
  resolveCredentialConfigId: jest.Mock;
  isOid4vciCallback: jest.Mock;
};
const authFlow = jest.requireMock('./authFlow') as {
  startAuthorizationCodeFlow: jest.Mock;
  finishAuthorizationCodeFlow: jest.Mock;
};
const proofBuilder = jest.requireMock('./proofBuilder') as {
  buildCredentialRequestProof: jest.Mock;
};
const mapper = jest.requireMock('./credentialMapper') as {
  requestCredentialWithIssuerCompat: jest.Mock;
  toCredentialReceivedResult: jest.Mock;
};

describe('Oid4vciHandler', () => {
  const handler = new Oid4vciHandler();
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
    credentials: [],
    activeDid: 'did:key:test',
  } as unknown as ProtocolContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('在 callback URI 时委托给授权回调处理', async () => {
    offerResolver.isOid4vciCallback.mockReturnValue(true);
    authFlow.finishAuthorizationCodeFlow.mockResolvedValue({ type: 'redirect', url: 'x' });

    const result = await handler.handle('did://oid4vci-callback', ctx);

    expect(authFlow.finishAuthorizationCodeFlow).toHaveBeenCalledWith(
      'did://oid4vci-callback',
      ctx,
      mapper.toCredentialReceivedResult
    );
    expect(result).toEqual({ type: 'redirect', url: 'x' });
  });

  it('在 authorization_code grant 时委托给 startAuthorizationCodeFlow', async () => {
    offerResolver.isOid4vciCallback.mockReturnValue(false);
    offerResolver.resolveCredentialOffer.mockResolvedValue({
      credential_issuer: 'https://issuer.example',
      grants: { authorization_code: {} },
    });
    oid4vciClient.resolveIssuerMetadata.mockResolvedValue({ issuer: 'meta' });
    authFlow.startAuthorizationCodeFlow.mockResolvedValue({
      type: 'redirect',
      url: 'https://issuer.example/auth',
    });

    const result = await handler.handle('openid-credential-offer://?x=1', ctx);

    expect(authFlow.startAuthorizationCodeFlow).toHaveBeenCalledWith({
      credential_issuer: 'https://issuer.example',
      grants: { authorization_code: {} },
    });
    expect(result).toEqual({
      type: 'redirect',
      url: 'https://issuer.example/auth',
    });
  });

  it('在 pre-authorized flow 时完成 token -> nonce -> proof -> credential 编排', async () => {
    offerResolver.isOid4vciCallback.mockReturnValue(false);
    offerResolver.resolveCredentialOffer.mockResolvedValue({
      credential_issuer: 'https://issuer.example',
      grants: {
        'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
          'pre-authorized_code': 'pre-code',
        },
      },
    });
    oid4vciClient.resolveIssuerMetadata.mockResolvedValue({ issuer: 'meta' });
    oid4vciClient.retrievePreAuthorizedCodeAccessTokenFromOffer.mockResolvedValue({
      accessTokenResponse: { access_token: 'access-token' },
    });
    offerResolver.resolveCredentialConfigId.mockReturnValue('ehic-config');
    oid4vciClient.requestNonce.mockResolvedValue({ c_nonce: 'nonce-1' });
    proofBuilder.buildCredentialRequestProof.mockResolvedValue({ jwt: 'proof.jwt' });
    mapper.requestCredentialWithIssuerCompat.mockResolvedValue({ credential: 'raw-credential' });
    mapper.toCredentialReceivedResult.mockResolvedValue({
      type: 'credential_received',
      credentials: [{ id: 'cred-1' }],
    });

    const result = await handler.handle('openid-credential-offer://?x=1', ctx);

    expect(oid4vciClient.retrievePreAuthorizedCodeAccessTokenFromOffer).toHaveBeenCalled();
    expect(proofBuilder.buildCredentialRequestProof).toHaveBeenCalledWith({
      issuerMetadata: { issuer: 'meta' },
      credentialConfigurationId: 'ehic-config',
      nonce: 'nonce-1',
    });
    expect(mapper.requestCredentialWithIssuerCompat).toHaveBeenCalledWith({
      accessToken: 'access-token',
      credentialIssuer: 'https://issuer.example',
      credentialConfigurationId: 'ehic-config',
      proofJwt: 'proof.jwt',
    });
    expect(result).toEqual({
      type: 'credential_received',
      credentials: [{ id: 'cred-1' }],
    });
  });

  it('在 grant 不支持时返回错误', async () => {
    offerResolver.isOid4vciCallback.mockReturnValue(false);
    offerResolver.resolveCredentialOffer.mockResolvedValue({
      credential_issuer: 'https://issuer.example',
      grants: {},
    });
    oid4vciClient.resolveIssuerMetadata.mockResolvedValue({ issuer: 'meta' });

    const result = await handler.handle('openid-credential-offer://?x=1', ctx);

    expect(result).toEqual({
      type: 'error',
      message:
        'Issuer offer does not expose a supported grant. Expected authorization_code or pre-authorized_code.',
    });
  });
});
