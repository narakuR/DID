import type { ProtocolContext } from '@/wallet-core/types/contracts';
import {
  extractRawCredential,
  requestCredentialWithIssuerCompat,
  toCredentialReceivedResult,
} from './credentialMapper';

jest.mock('./client', () => ({
  oid4vciCallbacks: {
    fetch: jest.fn(),
  },
}));

const { oid4vciCallbacks } = jest.requireMock('./client') as {
  oid4vciCallbacks: {
    fetch: jest.Mock;
  };
};

describe('credentialMapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractRawCredential', () => {
    it('优先读取顶层 credential 字段', () => {
      expect(extractRawCredential({ credential: 'top-level' })).toBe('top-level');
    });

    it('支持 credentials 数组中的字符串项', () => {
      expect(extractRawCredential({ credentials: ['from-array'] })).toBe('from-array');
    });

    it('支持 credentials 数组中的对象项', () => {
      expect(
        extractRawCredential({ credentials: [{ credential: 'from-object' }] })
      ).toBe('from-object');
    });

    it('在无紧凑凭证串时抛错', () => {
      expect(() => extractRawCredential({ credentials: [{}] })).toThrow(
        'Issuer response does not contain a compact credential string'
      );
    });
  });

  describe('requestCredentialWithIssuerCompat', () => {
    it('按 issuer 兼容请求 credential endpoint', async () => {
      oid4vciCallbacks.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ credential: 'raw-cred' }),
      });

      const result = await requestCredentialWithIssuerCompat({
        accessToken: 'access-token',
        credentialIssuer: 'https://issuer.example',
        credentialConfigurationId: 'config-1',
        proofJwt: 'proof.jwt',
      });

      expect(oid4vciCallbacks.fetch).toHaveBeenCalledWith(
        'https://issuer.example/wallet/credentialEndpoint',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer access-token',
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual({ credential: 'raw-cred' });
    });

    it('在 issuer 返回错误时带出响应详情', async () => {
      oid4vciCallbacks.fetch.mockResolvedValue({
        ok: false,
        text: async () => JSON.stringify({ error: 'bad_request' }),
      });

      await expect(
        requestCredentialWithIssuerCompat({
          accessToken: 'access-token',
          credentialIssuer: 'https://issuer.example',
          credentialConfigurationId: 'config-1',
          proofJwt: 'proof.jwt',
        })
      ).rejects.toThrow(/Error retrieving credentials/);
    });
  });

  describe('toCredentialReceivedResult', () => {
    function createContext() {
      const parse = jest.fn().mockResolvedValue({
        format: 'sd-jwt-vc',
        raw: 'raw-cred',
        claims: {},
        issuerDid: 'did:key:issuer',
      });
      const toDisplayModel = jest.fn().mockReturnValue({
        id: 'cred-1',
        type: ['VerifiableCredential', 'EHIC'],
      });

      const ctx = {
        registry: {
          getCredentialFormat: jest.fn().mockReturnValue({
            parse,
            toDisplayModel,
          }),
        },
      } as unknown as ProtocolContext;

      return { ctx, parse, toDisplayModel };
    }

    it('对 EHIC 配置选择 sd-jwt-vc handler 并回填 _raw/_format', async () => {
      const { ctx, parse } = createContext();

      const result = await toCredentialReceivedResult(
        ctx,
        'urn:eudi:ehic:1:dc+sd-jwt-compact',
        { credential: 'raw-cred' }
      );

      expect(ctx.registry.getCredentialFormat).toHaveBeenCalledWith('sd-jwt-vc');
      expect(parse).toHaveBeenCalledWith('raw-cred');
      expect(result).toEqual({
        type: 'credential_received',
        credentials: [
          {
            id: 'cred-1',
            type: ['VerifiableCredential', 'EHIC'],
            _raw: 'raw-cred',
            _format: 'sd-jwt-vc',
          },
        ],
      });
    });

    it('对非 EHIC 配置默认选择 jwt_vc_json handler', async () => {
      const { ctx } = createContext();

      await toCredentialReceivedResult(ctx, 'some-other-config', {
        credential: 'raw-cred',
      });

      expect(ctx.registry.getCredentialFormat).toHaveBeenCalledWith('jwt_vc_json');
    });
  });
});
