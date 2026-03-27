import { selectMatches } from './dcqlMatcher';

describe('dcqlMatcher', () => {
  const ehicCredential = {
    id: 'cred-ehic',
    type: ['VerifiableCredential', 'EHICCredential'],
    visual: {
      description: 'urn:eudi:ehic:1',
    },
  };

  const pidCredential = {
    id: 'cred-pid',
    type: ['VerifiableCredential', 'PIDCredential'],
    visual: {
      description: 'urn:eudi:pid:1',
    },
  };

  it('按 meta.type 匹配凭证', () => {
    const result = selectMatches(
      {
        dcql_query: {
          credentials: [
            {
              id: 'q1',
              meta: { type: 'PIDCredential' },
            },
          ],
        },
      },
      [ehicCredential as never, pidCredential as never]
    );

    expect(result).toEqual([
      {
        credential: pidCredential,
        disclosedClaims: [],
        queryId: 'q1',
      },
    ]);
  });

  it('按 vct_values 归一化后匹配凭证', () => {
    const result = selectMatches(
      {
        dcql_query: {
          credentials: [
            {
              id: 'q1',
              meta: { vct_values: ['urn:eu.europa.ec.eudi:ehic:1', 'urn:eudi:ehic:1'] },
            },
          ],
        },
      },
      [ehicCredential as never]
    );

    expect(result).toEqual([
      {
        credential: ehicCredential,
        disclosedClaims: [],
        queryId: 'q1',
      },
    ]);
  });

  it('提取 claims 路径为 disclosedClaims', () => {
    const result = selectMatches(
      {
        dcql_query: {
          credentials: [
            {
              id: 'q1',
              claims: [
                { path: ['given_name'] },
                { path: ['address', 'country'] },
              ],
            },
          ],
        },
      },
      [ehicCredential as never]
    );

    expect(result).toEqual([
      {
        credential: ehicCredential,
        disclosedClaims: ['given_name', 'address.country'],
        queryId: 'q1',
      },
    ]);
  });

  it('在 format 不支持时不匹配', () => {
    const result = selectMatches(
      {
        dcql_query: {
          credentials: [
            {
              id: 'q1',
              format: 'mso_mdoc',
            },
          ],
        },
      },
      [ehicCredential as never]
    );

    expect(result).toEqual([]);
  });
});
