import type { ProtocolContext, ProtocolResult } from '@/wallet-core/types/contracts';
import {
  clearPendingAuthRequest,
  finishAuthorizationCodeFlow,
  loadPendingAuthRequest,
  startAuthorizationCodeFlow,
} from './authFlow';

jest.mock('@openid4vc/openid4vci', () => ({
  AuthorizationFlow: {
    Oauth2Redirect: 'Oauth2Redirect',
  },
}));

jest.mock('@/services/storageService', () => ({
  storageService: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('./client', () => ({
  oid4vciClient: {
    resolveIssuerMetadata: jest.fn(),
    initiateAuthorization: jest.fn(),
    parseAndVerifyAuthorizationResponseRedirectUrl: jest.fn(),
    retrieveAuthorizationCodeAccessTokenFromOffer: jest.fn(),
    requestNonce: jest.fn(),
  },
}));

jest.mock('./proofBuilder', () => ({
  buildCredentialRequestProof: jest.fn(),
}));

jest.mock('./credentialMapper', () => ({
  requestCredentialWithIssuerCompat: jest.fn(),
}));

jest.mock('./offerResolver', () => ({
  resolveCredentialConfigId: jest.fn(),
  resolveCredentialScope: jest.fn(),
}));

const { storageService } = jest.requireMock('@/services/storageService') as {
  storageService: {
    setItem: jest.Mock;
    getItem: jest.Mock;
    removeItem: jest.Mock;
  };
};
const { oid4vciClient } = jest.requireMock('./client') as {
  oid4vciClient: {
    resolveIssuerMetadata: jest.Mock;
    initiateAuthorization: jest.Mock;
    parseAndVerifyAuthorizationResponseRedirectUrl: jest.Mock;
    retrieveAuthorizationCodeAccessTokenFromOffer: jest.Mock;
    requestNonce: jest.Mock;
  };
};
const { buildCredentialRequestProof } = jest.requireMock('./proofBuilder') as {
  buildCredentialRequestProof: jest.Mock;
};
const { requestCredentialWithIssuerCompat } = jest.requireMock('./credentialMapper') as {
  requestCredentialWithIssuerCompat: jest.Mock;
};
const offerResolver = jest.requireMock('./offerResolver') as {
  resolveCredentialConfigId: jest.Mock;
  resolveCredentialScope: jest.Mock;
};

describe('authFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('startAuthorizationCodeFlow 在 OAuth2Redirect 时保存 pending request 并返回 redirect', async () => {
    oid4vciClient.resolveIssuerMetadata.mockResolvedValue({
      authorizationServers: [{ issuer: 'as-1' }],
    });
    offerResolver.resolveCredentialConfigId.mockReturnValue('config-1');
    offerResolver.resolveCredentialScope.mockReturnValue('scope-1');
    oid4vciClient.initiateAuthorization.mockResolvedValue({
      authorizationFlow: 'Oauth2Redirect',
      authorizationRequestUrl: 'https://issuer.example/auth',
      pkce: { codeVerifier: 'verifier-1' },
    });

    const result = await startAuthorizationCodeFlow({
      credential_issuer: 'https://issuer.example',
      grants: { authorization_code: {} },
    } as never);

    expect(storageService.setItem).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        credentialConfigurationId: 'config-1',
        pkceCodeVerifier: 'verifier-1',
      })
    );
    expect(result).toEqual({
      type: 'redirect',
      url: 'https://issuer.example/auth',
    });
  });

  it('startAuthorizationCodeFlow 在非 OAuth2Redirect 时返回错误', async () => {
    oid4vciClient.resolveIssuerMetadata.mockResolvedValue({
      authorizationServers: [{ issuer: 'as-1' }],
    });
    offerResolver.resolveCredentialConfigId.mockReturnValue('config-1');
    offerResolver.resolveCredentialScope.mockReturnValue('scope-1');
    oid4vciClient.initiateAuthorization.mockResolvedValue({
      authorizationFlow: 'PresentationDuringIssuance',
    });

    const result = await startAuthorizationCodeFlow({
      credential_issuer: 'https://issuer.example',
      grants: { authorization_code: {} },
    } as never);

    expect(result).toEqual({
      type: 'error',
      message:
        'Issuer requested presentation-during-issuance, which is not yet supported in this MVP.',
    });
  });

  it('finishAuthorizationCodeFlow 在 pending 缺失时返回错误', async () => {
    storageService.getItem.mockResolvedValue(null);

    const result = await finishAuthorizationCodeFlow(
      'did://callback?code=123',
      {} as ProtocolContext,
      jest.fn()
    );

    expect(result).toEqual({
      type: 'error',
      message: 'No pending authorization request found for OID4VCI callback.',
    });
  });

  it('finishAuthorizationCodeFlow 在 callback 缺 code 时返回 issuer 错误描述', async () => {
    storageService.getItem.mockResolvedValue({
      issuerMetadata: { authorizationServers: [{ issuer: 'as-1' }] },
    });
    oid4vciClient.parseAndVerifyAuthorizationResponseRedirectUrl.mockReturnValue({
      error: 'access_denied',
      error_description: 'user denied access',
    });

    const result = await finishAuthorizationCodeFlow(
      'did://callback?error=1',
      {} as ProtocolContext,
      jest.fn()
    );

    expect(result).toEqual({
      type: 'error',
      message: 'user denied access',
    });
  });

  it('finishAuthorizationCodeFlow 完成 token、nonce、proof、credential 编排并清理 pending', async () => {
    storageService.getItem.mockResolvedValue({
      issuerMetadata: { authorizationServers: [{ issuer: 'as-1' }] },
      credentialOffer: { credential_issuer: 'https://issuer.example' },
      credentialConfigurationId: 'config-1',
      pkceCodeVerifier: 'verifier-1',
      redirectUri: 'did://oid4vci',
    });
    oid4vciClient.parseAndVerifyAuthorizationResponseRedirectUrl.mockReturnValue({
      code: 'auth-code',
    });
    oid4vciClient.retrieveAuthorizationCodeAccessTokenFromOffer.mockResolvedValue({
      accessTokenResponse: { access_token: 'access-token' },
    });
    oid4vciClient.requestNonce.mockResolvedValue({ c_nonce: 'nonce-1' });
    buildCredentialRequestProof.mockResolvedValue({ jwt: 'proof.jwt' });
    requestCredentialWithIssuerCompat.mockResolvedValue({ credential: 'raw-cred' });

    const toCredentialReceivedResult = jest
      .fn<
        Promise<ProtocolResult>,
        [ProtocolContext, string, { credential?: unknown; credentials?: ({ credential?: unknown } | unknown)[] }]
      >()
      .mockResolvedValue({
        type: 'credential_received',
        credentials: [
          {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            id: 'cred-1',
            type: ['VerifiableCredential'],
            issuer: { id: 'did:key:issuer', name: 'issuer', type: 'government' as never },
            issuanceDate: new Date().toISOString(),
            expirationDate: new Date().toISOString(),
            credentialSubject: {} as never,
            status: 'active',
          },
        ],
      });

    const ctx = { activeDid: 'did:key:test' } as ProtocolContext;
    const result = await finishAuthorizationCodeFlow(
      'did://callback?code=auth-code',
      ctx,
      toCredentialReceivedResult
    );

    expect(oid4vciClient.retrieveAuthorizationCodeAccessTokenFromOffer).toHaveBeenCalled();
    expect(buildCredentialRequestProof).toHaveBeenCalledWith({
      issuerMetadata: { authorizationServers: [{ issuer: 'as-1' }] },
      credentialConfigurationId: 'config-1',
      nonce: 'nonce-1',
    });
    expect(requestCredentialWithIssuerCompat).toHaveBeenCalledWith({
      accessToken: 'access-token',
      credentialIssuer: 'https://issuer.example',
      credentialConfigurationId: 'config-1',
      proofJwt: 'proof.jwt',
    });
    expect(storageService.removeItem).toHaveBeenCalled();
    expect(result).toEqual({
      type: 'credential_received',
      credentials: [
        expect.objectContaining({
          id: 'cred-1',
        }),
      ],
    });
  });

  it('loadPendingAuthRequest / clearPendingAuthRequest 走 storageService', async () => {
    storageService.getItem.mockResolvedValue({ foo: 'bar' });

    const loaded = await loadPendingAuthRequest();
    await clearPendingAuthRequest();

    expect(loaded).toEqual({ foo: 'bar' });
    expect(storageService.removeItem).toHaveBeenCalled();
  });
});
