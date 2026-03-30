import {
  listAvailableIssuerCredentialConfigurations,
  listIssuerCredentialConfigurations,
  resolveCredentialConfiguration,
} from './offerResolver';

jest.mock('./client', () => ({
  oid4vciClient: {},
}));

jest.mock('@/wallet-core/transport/httpClient', () => ({
  fetchJson: jest.fn(),
}));

const { fetchJson } = jest.requireMock('@/wallet-core/transport/httpClient') as {
  fetchJson: jest.Mock;
};

describe('offerResolver metadata compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('支持 credentialsSupported 数组结构', () => {
    const configurations = listIssuerCredentialConfigurations({
      credentialsSupported: [
        {
          id: 'urn:eudi:pid:1:sd-jwt',
          format: 'dc+sd-jwt',
          scope: 'pid_scope',
          display: [{ name: 'PID' }],
          proof_types_supported: {
            jwt: {
              proof_signing_alg_values_supported: ['EdDSA'],
            },
          },
        },
        {
          doctype: 'org.iso.18013.5.1.mDL',
          format: 'mso_mdoc',
          display: [{ name: 'mDL' }],
        },
      ],
    });

    expect(configurations).toEqual([
      expect.objectContaining({
        id: 'urn:eudi:pid:1:sd-jwt',
        format: 'sd-jwt-vc',
        rawFormat: 'dc+sd-jwt',
        scope: 'pid_scope',
        displayName: 'PID',
      }),
      expect.objectContaining({
        id: 'org.iso.18013.5.1.mDL',
        format: 'mso_mdoc',
        displayName: 'mDL',
      }),
    ]);
  });

  it('resolveCredentialConfiguration 在未知格式时保守回退为 jwt_vc_json', () => {
    const configuration = resolveCredentialConfiguration('config-1', {
      credentialsSupported: [
        {
          id: 'config-1',
          format: 'unknown-format',
        },
      ],
    });

    expect(configuration).toEqual(
      expect.objectContaining({
        id: 'config-1',
        format: 'jwt_vc_json',
        rawFormat: 'unknown-format',
      })
    );
  });

  it('支持 knownCredentialConfigurations 对象结构', () => {
    const configurations = listIssuerCredentialConfigurations({
      knownCredentialConfigurations: {
        'urn:eudi:pid:1': {
          format: 'dc+sd-jwt',
          display: [{ name: 'PID' }],
        },
        'urn:eu.europa.ec.eudi:learning:credential:1': {
          format: 'dc+sd-jwt',
          display: [{ name: 'Learning Credential' }],
        },
      },
    });

    expect(configurations).toEqual([
      expect.objectContaining({
        id: 'urn:eudi:pid:1',
        format: 'sd-jwt-vc',
        displayName: 'PID',
      }),
      expect.objectContaining({
        id: 'urn:eu.europa.ec.eudi:learning:credential:1',
        format: 'sd-jwt-vc',
        displayName: 'Learning Credential',
      }),
    ]);
  });

  it('在 openid-credential-issuer 为空时回退到 jwt-vc-issuer 的 type_metadata', async () => {
    fetchJson.mockResolvedValue({
      type_metadata: {
        'urn:eudi:pid:1': {
          format: 'dc+sd-jwt',
          display: [{ name: 'PID' }],
        },
        'urn:eu.europa.ec.eudi:learning:credential:1': {
          format: 'dc+sd-jwt',
          display: [{ name: 'Learning Credential' }],
        },
      },
    });

    const configurations = await listAvailableIssuerCredentialConfigurations(
      'https://localhost:8444/pid-issuer',
      {}
    );

    expect(fetchJson).toHaveBeenCalledWith(
      'https://localhost:8444/.well-known/jwt-vc-issuer/pid-issuer',
      expect.any(Object)
    );
    expect(configurations).toEqual([
      expect.objectContaining({
        id: 'urn:eudi:pid:1',
        vct: 'urn:eudi:pid:1',
        format: 'sd-jwt-vc',
        source: 'jwt-vc-issuer',
        displayName: 'PID',
      }),
      expect.objectContaining({
        id: 'urn:eu.europa.ec.eudi:learning:credential:1',
        vct: 'urn:eu.europa.ec.eudi:learning:credential:1',
        format: 'sd-jwt-vc',
        source: 'jwt-vc-issuer',
        displayName: 'Learning Credential',
      }),
    ]);
  });
});
