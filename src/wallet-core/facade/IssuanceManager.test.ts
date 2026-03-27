import type { ProtocolContext } from '@/wallet-core/types/contracts';
import { IssuanceManager } from './IssuanceManager';

describe('IssuanceManager', () => {
  const persistence = {
    saveIssuedCredential: jest.fn(),
    addDisplayCredential: jest.fn(),
  };

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
    _raw: 'raw-token',
    _format: 'sd-jwt-vc',
  } as const;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('credential_received 时持久化凭证并返回 issuance_completed session', async () => {
    const manager = new IssuanceManager(persistence);
    const handler = {
      handle: jest.fn().mockResolvedValue({
        type: 'credential_received',
        credentials: [credential],
      }),
    };

    const result = await manager.handleWithHandler(
      handler as never,
      'openid-credential-offer://?x=1',
      {} as ProtocolContext
    );

    expect(persistence.saveIssuedCredential).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'cred-1',
        raw: 'raw-token',
        format: 'sd-jwt-vc',
      })
    );
    expect(persistence.addDisplayCredential).toHaveBeenCalledWith(credential);
    expect(result.kind).toBe('issuance_completed');
    if (result.kind === 'issuance_completed') {
      expect(result.session.documents[0]).toEqual(
        expect.objectContaining({
          id: 'cred-1',
          title: 'EHIC',
        })
      );
    }
  });

  it('redirect 时返回 issuance_redirect session', async () => {
    const manager = new IssuanceManager(persistence);
    const handler = {
      handle: jest.fn().mockResolvedValue({
        type: 'redirect',
        url: 'https://issuer.example/auth',
      }),
    };

    const result = await manager.handleWithHandler(
      handler as never,
      'openid-credential-offer://?x=1',
      {} as ProtocolContext
    );

    expect(result).toEqual({
      kind: 'issuance_redirect',
      session: expect.objectContaining({
        uri: 'openid-credential-offer://?x=1',
        status: 'redirect_required',
        redirectUrl: 'https://issuer.example/auth',
        documents: [],
      }),
      protocolResult: {
        type: 'redirect',
        url: 'https://issuer.example/auth',
      },
    });
  });

  it('error 时返回 failure operation', async () => {
    const manager = new IssuanceManager(persistence);
    const handler = {
      handle: jest.fn().mockResolvedValue({
        type: 'error',
        message: 'issuer failed',
      }),
    };

    const result = await manager.handleWithHandler(
      handler as never,
      'openid-credential-offer://?x=1',
      {} as ProtocolContext
    );

    expect(result).toEqual({
      kind: 'failure',
      message: 'issuer failed',
      protocolResult: {
        type: 'error',
        message: 'issuer failed',
      },
    });
  });
});
