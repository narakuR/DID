import type { ProtocolContext } from '@/wallet-core/types/contracts';
import {
  extractRawCredential,
  requestCredentialWithIssuerCompat,
  resolveDeferredCredentialResponse,
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

    it('支持 credentials 数组中的结构化 credential 对象', () => {
      expect(
        extractRawCredential({
          credentials: [
            {
              credential: {
                nameSpaces: {
                  'eu.europa.ec.eudi.pid.1': [],
                },
                issuerAuth: [],
              },
            },
          ],
        })
      ).toBe(
        '{"nameSpaces":{"eu.europa.ec.eudi.pid.1":[]},"issuerAuth":[]}'
      );
    });

    it('支持 credentials 数组中的 value 包装对象', () => {
      expect(
        extractRawCredential({
          credentials: [
            {
              value: {
                credential: 'wrapped-cred',
              },
            },
          ],
        })
      ).toBe('wrapped-cred');
    });

    it('在无可识别凭证载荷时抛错', () => {
      expect(() => extractRawCredential({ credentials: [{}] })).toThrow(/supported credential payload/);
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

    it('deferred 首次响应缺少 acceptance_token 时回填 access token', async () => {
      oid4vciCallbacks.fetch.mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            transaction_id: 'tx-1',
            interval: 1,
          }),
      });

      const result = await requestCredentialWithIssuerCompat({
        accessToken: 'access-token',
        credentialIssuer: 'https://issuer.example',
        credentialConfigurationId: 'config-1',
        proofJwt: 'proof.jwt',
      });

      expect(result).toEqual({
        transaction_id: 'tx-1',
        interval: 1,
        acceptance_token: 'access-token',
      });
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

  describe('resolveDeferredCredentialResponse', () => {
    it('对 deferred issuance 自动轮询直到拿到 credential', async () => {
      oid4vciCallbacks.fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () =>
            JSON.stringify({
              error: 'authorization_pending',
              interval: 0,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ credential: 'raw-cred' }),
        });

      const result = await resolveDeferredCredentialResponse({
        credentialIssuer: 'https://issuer.example',
        issuerMetadata: {
          credentialIssuer: {
            deferred_credential_endpoint:
              'https://issuer.example/wallet/deferredEndpoint',
          },
        },
        credentialResponse: {
          transaction_id: 'tx-1',
          acceptance_token: 'acceptance-token',
          interval: 0,
        },
        maxAttempts: 2,
      });

      expect(oid4vciCallbacks.fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ credential: 'raw-cred' });
    });

    it('对 202 accepted 的 pending 响应继续轮询直到 issued', async () => {
      oid4vciCallbacks.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          text: async () =>
            JSON.stringify({
              transaction_id: 'tx-1',
              interval: 0,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              credentials: [{ credential: 'raw-cred' }],
            }),
        });

      const result = await resolveDeferredCredentialResponse({
        credentialIssuer: 'https://issuer.example',
        issuerMetadata: {
          credentialIssuer: {
            deferred_credential_endpoint:
              'https://issuer.example/wallet/deferredEndpoint',
          },
        },
        credentialResponse: {
          transaction_id: 'tx-1',
          acceptance_token: 'acceptance-token',
          interval: 0,
        },
        maxAttempts: 2,
      });

      expect(oid4vciCallbacks.fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        credentials: [{ credential: 'raw-cred' }],
      });
    });
  });

  describe('toCredentialReceivedResult', () => {
    function createContext() {
      const sdJwtParse = jest.fn().mockResolvedValue({
        format: 'sd-jwt-vc',
        raw: 'raw-cred',
        claims: {},
        issuerDid: 'did:key:issuer',
      });
      const jwtParse = jest.fn().mockResolvedValue({
        format: 'jwt_vc_json',
        raw: 'aaa.bbb.ccc',
        claims: {},
        issuerDid: 'did:key:issuer',
      });
      const mdocParse = jest.fn().mockResolvedValue({
        format: 'mso_mdoc',
        raw: 'encoded-mdoc',
        claims: {},
        issuerDid: 'x509',
      });
      const toDisplayModel = jest.fn().mockReturnValue({
        id: 'cred-1',
        type: ['VerifiableCredential', 'EHIC'],
      });

      const handlers = {
        'sd-jwt-vc': {
          parse: sdJwtParse,
          toDisplayModel,
        },
        jwt_vc_json: {
          parse: jwtParse,
          toDisplayModel,
        },
        mso_mdoc: {
          parse: mdocParse,
          toDisplayModel,
        },
      } as const;

      const ctx = {
        registry: {
          getCredentialFormat: jest.fn((name: keyof typeof handlers) => handlers[name]),
        },
      } as unknown as ProtocolContext;

      return {
        ctx,
        sdJwtParse,
        jwtParse,
        mdocParse,
        toDisplayModel,
      };
    }

    it('对 EHIC 配置选择 sd-jwt-vc handler 并回填 _raw/_format', async () => {
      const { ctx, sdJwtParse } = createContext();

      const result = await toCredentialReceivedResult(
        ctx,
        'https://issuer.example',
        'urn:eudi:ehic:1:dc+sd-jwt-compact',
        {
          credential_configurations_supported: {
            'urn:eudi:ehic:1:dc+sd-jwt-compact': {
              format: 'dc+sd-jwt',
            },
          },
        },
        { credential: 'raw-cred' }
      );

      expect(ctx.registry.getCredentialFormat).toHaveBeenCalledWith('sd-jwt-vc');
      expect(sdJwtParse).toHaveBeenCalledWith('raw-cred');
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

      await toCredentialReceivedResult(
        ctx,
        'https://issuer.example',
        'some-other-config',
        undefined,
        {
          credential: 'aaa.bbb.ccc',
        }
      );

      expect(ctx.registry.getCredentialFormat).toHaveBeenCalledWith('jwt_vc_json');
    });

    it('根据 issuer metadata 的 format 选择 mso_mdoc handler', async () => {
      const { ctx } = createContext();

      await toCredentialReceivedResult(
        ctx,
        'https://issuer.example',
        'org.iso.18013.5.1.mDL',
        {
          credential_configurations_supported: {
            'org.iso.18013.5.1.mDL': {
              format: 'mso_mdoc',
            },
          },
        },
        {
          credential: 'encoded-mdoc',
        }
      );

      expect(ctx.registry.getCredentialFormat).toHaveBeenCalledWith('mso_mdoc');
    });

    it('支持 deferred issued 响应里的结构化 mdoc credential 对象', async () => {
      const { ctx, mdocParse } = createContext();

      await toCredentialReceivedResult(
        ctx,
        'https://issuer.example',
        'eu.europa.ec.eudi.pid_mso_mdoc_deferred',
        {
          credential_configurations_supported: {
            'eu.europa.ec.eudi.pid_mso_mdoc_deferred': {
              format: 'mso_mdoc',
            },
          },
        },
        {
          credentials: [
            {
              credential: {
                nameSpaces: {
                  'eu.europa.ec.eudi.pid.1': [],
                },
                issuerAuth: [],
              },
            },
          ],
        }
      );

      expect(mdocParse).toHaveBeenCalledWith(
        '{"nameSpaces":{"eu.europa.ec.eudi.pid.1":[]},"issuerAuth":[]}'
      );
    });

    it('metadata 指向 mso_mdoc 但原始 credential 更像 JWT 时回退到 jwt_vc_json parser', async () => {
      const { ctx, mdocParse, jwtParse } = createContext();
      mdocParse.mockRejectedValueOnce(
        new Error('Invalid base64url string: contains invalid characters')
      );

      await toCredentialReceivedResult(
        ctx,
        'https://issuer.example',
        'eu.europa.ec.eudi_mso_mdoc',
        {
          credential_configurations_supported: {
            'eu.europa.ec.eudi_mso_mdoc': {
              format: 'mso_mdoc',
            },
          },
        },
        {
          credential: 'aaa.bbb.ccc',
        }
      );

      expect(mdocParse).toHaveBeenCalledWith('aaa.bbb.ccc');
      expect(jwtParse).toHaveBeenCalledWith('aaa.bbb.ccc');
      expect(ctx.registry.getCredentialFormat).toHaveBeenCalledWith('mso_mdoc');
      expect(ctx.registry.getCredentialFormat).toHaveBeenCalledWith('jwt_vc_json');
    });

    it('在全部 parser 失败时带出 raw credential 摘要', async () => {
      const { ctx, mdocParse } = createContext();
      mdocParse.mockRejectedValueOnce(
        new Error('Invalid base64url string: contains invalid characters')
      );

      await expect(
        toCredentialReceivedResult(
          ctx,
          'https://issuer.example',
          'eu.europa.ec.eudi_mso_mdoc',
          {
            credential_configurations_supported: {
              'eu.europa.ec.eudi_mso_mdoc': {
                format: 'mso_mdoc',
              },
            },
          },
          {
            credential: 'abc+/=',
          }
        )
      ).rejects.toThrow(
        'raw=len=6,dots=1,hasTilde=false,preview=abc+/='
      );
    });
  });
});
