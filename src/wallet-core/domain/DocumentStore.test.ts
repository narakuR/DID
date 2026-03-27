import { clearDocuments, syncDocuments, useDocumentStore } from './DocumentStore';
import { documentManager } from './DocumentManager';

describe('DocumentStore / DocumentManager', () => {
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
    clearDocuments();
  });

  it('syncDocuments 将 credential 映射为 WalletDocument', () => {
    syncDocuments([credential as never]);

    const state = useDocumentStore.getState();
    expect(state.isHydrated).toBe(true);
    expect(state.documents).toHaveLength(1);
    expect(state.documents[0]).toEqual(
      expect.objectContaining({
        id: 'cred-1',
        title: 'EHIC',
        description: 'urn:eudi:ehic:1',
      })
    );
  });

  it('DocumentManager 可列出并按 id 获取 document', () => {
    syncDocuments([credential as never]);

    const documents = documentManager.listDocuments();
    const document = documentManager.getDocument('cred-1');

    expect(documents).toHaveLength(1);
    expect(document?.id).toBe('cred-1');
  });

  it('DocumentManager 可返回凭证读模型', () => {
    syncDocuments([credential as never]);

    const credentials = documentManager.listCredentials();
    const resolved = documentManager.getCredential('cred-1');

    expect(credentials).toHaveLength(1);
    expect(credentials[0]).toBe(credential);
    expect(resolved).toBe(credential);
  });

  it('clearDocuments 清空文档列表', () => {
    syncDocuments([credential as never]);
    clearDocuments();

    expect(useDocumentStore.getState().documents).toEqual([]);
    expect(useDocumentStore.getState().isHydrated).toBe(true);
  });
});
