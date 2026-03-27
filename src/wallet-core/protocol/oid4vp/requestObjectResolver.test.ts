import {
  extractVerifierName,
  fetchRequestObjectJwt,
  parseOpenid4vpUri,
  parseRequestObjectJwt,
} from './requestObjectResolver';

describe('requestObjectResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('extractVerifierName 对 did client_id 做截断展示', () => {
    expect(
      extractVerifierName({
        client_id: 'did:web:verifier.example:wallet:reader:long-suffix',
      })
    ).toContain('…');
  });

  it('extractVerifierName 对 URL client_id 返回 hostname', () => {
    expect(
      extractVerifierName({
        client_id: 'https://verifier.example/request',
      })
    ).toBe('verifier.example');
  });

  it('parseOpenid4vpUri 能解析 request_uri / request / request_uri_method', () => {
    const result = parseOpenid4vpUri(
      'openid4vp://?request_uri=https%3A%2F%2Fverifier.example%2Fjar&request=jwt-token&request_uri_method=post'
    );

    expect(result).toEqual({
      requestUri: 'https://verifier.example/jar',
      requestJwt: 'jwt-token',
      requestUriMethod: 'post',
    });
  });

  it('fetchRequestObjectJwt 对 POST 模式附带 wallet_metadata 和 wallet_nonce', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => 'jwt-response',
    });

    const result = await fetchRequestObjectJwt('https://verifier.example/jar', 'post');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://verifier.example/jar',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/oauth-authz-req+jwt',
        }),
      })
    );
    const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
    expect(decodeURIComponent(body)).toContain('wallet_metadata=');
    expect(body).toContain('wallet_nonce=');
    expect(result).toBe('jwt-response');
  });

  it('fetchRequestObjectJwt 在 GET 模式请求失败时抛错', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(
      fetchRequestObjectJwt('https://verifier.example/jar')
    ).rejects.toThrow('Failed to fetch request object (500)');
  });

  it('parseRequestObjectJwt 解析 JWT payload', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' }))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const payload = Buffer.from(
      JSON.stringify({
        client_id: 'https://verifier.example',
        response_uri: 'https://verifier.example/direct_post',
      })
    )
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const jwt = `${header}.${payload}.bbb`;

    const result = parseRequestObjectJwt(jwt);

    expect(result).toEqual({
      client_id: 'https://verifier.example',
      response_uri: 'https://verifier.example/direct_post',
    });
  });
});
