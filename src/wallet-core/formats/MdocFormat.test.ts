const fromEncodedForOid4Vci = jest.fn();
const fromEncodedStructure = jest.fn();
const issuerAuthFromEncodedStructure = jest.fn();
const issuerNamespacesCreate = jest.fn();
const issuerSignedItemFromEncodedStructure = jest.fn();
const issuerSignedItemFromDataItem = jest.fn();
const issuerSignedCreate = jest.fn();
const documentDecode = jest.fn();
const cborDecode = jest.fn();
const dataItemFromData = jest.fn();

class MockDataItem {
  data: unknown;
  buffer?: Uint8Array;

  constructor(data: unknown, buffer?: Uint8Array) {
    this.data = data;
    this.buffer = buffer;
  }

  static fromData(data: unknown) {
    return dataItemFromData(data);
  }

  static fromBuffer(buffer: Uint8Array) {
    return new MockDataItem(undefined, buffer);
  }
}

jest.mock('@owf/mdoc', () => ({
  cborDecode: (...args: unknown[]) => cborDecode(...args),
  DataItem: MockDataItem,
  IssuerSigned: {
    fromEncodedForOid4Vci: (...args: unknown[]) => fromEncodedForOid4Vci(...args),
    fromEncodedStructure: (...args: unknown[]) => fromEncodedStructure(...args),
    create: (...args: unknown[]) => issuerSignedCreate(...args),
  },
  IssuerAuth: {
    fromEncodedStructure: (...args: unknown[]) => issuerAuthFromEncodedStructure(...args),
  },
  IssuerNamespaces: {
    create: (...args: unknown[]) => issuerNamespacesCreate(...args),
  },
  IssuerSignedItem: {
    fromEncodedStructure: (...args: unknown[]) => issuerSignedItemFromEncodedStructure(...args),
    fromDataItem: (...args: unknown[]) => issuerSignedItemFromDataItem(...args),
  },
  Document: {
    decode: (...args: unknown[]) => documentDecode(...args),
  },
}));

jest.mock('cbor-x', () => ({
  decode: (...args: unknown[]) => cborDecode(...args),
}));

import { MdocFormat } from './MdocFormat';

describe('MdocFormat', () => {
  beforeEach(() => {
    fromEncodedForOid4Vci.mockReset();
    fromEncodedStructure.mockReset();
    issuerAuthFromEncodedStructure.mockReset();
    issuerNamespacesCreate.mockReset();
    issuerSignedItemFromEncodedStructure.mockReset();
    issuerSignedItemFromDataItem.mockReset();
    issuerSignedCreate.mockReset();
    documentDecode.mockReset();
    cborDecode.mockReset();
    dataItemFromData.mockReset();
    fromEncodedForOid4Vci.mockReturnValue({
      issuerAuth: {
        mobileSecurityObject: {
          docType: 'eu.europa.ec.eudi.pid.1',
          validityInfo: {},
        },
      },
      issuerNamespaces: {
        issuerNamespaces: new Map(),
      },
      getPrettyClaims: jest.fn(),
    });
    fromEncodedStructure.mockImplementation(() => {
      throw new Error('not-an-issuer-signed-structure');
    });
    issuerAuthFromEncodedStructure.mockImplementation((value) => ({
      encoded: value,
      mobileSecurityObject: {
        docType: 'eu.europa.ec.eudi.pid.1',
        validityInfo: {},
      },
    }));
    issuerNamespacesCreate.mockImplementation((value) => value);
    issuerSignedItemFromEncodedStructure.mockImplementation((value) => ({
      encoded: value,
      elementIdentifier: 'family_name',
      elementValue: 'Zhang',
    }));
    issuerSignedItemFromDataItem.mockImplementation(() => ({
      elementIdentifier: 'family_name',
      elementValue: 'Zhang',
    }));
    issuerSignedCreate.mockImplementation(({ issuerAuth }) => ({
      issuerAuth,
      issuerNamespaces: {
        issuerNamespaces: new Map([
          [
            'eu.europa.ec.eudi.pid.1',
            [
              {
                elementIdentifier: 'family_name',
                elementValue: 'Zhang',
              },
            ],
          ],
        ]),
      },
      getPrettyClaims: jest.fn().mockReturnValue({ family_name: 'Zhang' }),
    }));
    documentDecode.mockImplementation(() => {
      throw new Error('not-a-document');
    });
    cborDecode.mockImplementation(() => {
      throw new Error('not-cbor');
    });
    dataItemFromData.mockImplementation((value) => new MockDataItem(value));
  });

  it('兼容普通 base64 编码的 mdoc 字符串', async () => {
    const format = new MdocFormat();

    await format.parse('YWJjZC8rPQ==');

    expect(fromEncodedForOid4Vci).toHaveBeenCalledWith('YWJjZC8rPQ');
  });

  it('兼容带 data 前缀的 base64 字符串', async () => {
    const format = new MdocFormat();

    await format.parse('data:application/octet-stream;base64,YWJjZA==');

    expect(fromEncodedForOid4Vci).toHaveBeenCalledWith('YWJjZA');
  });

  it('当裸 IssuerSigned 解析失败时回退解析 Document 包装', async () => {
    fromEncodedForOid4Vci.mockImplementation(() => {
      throw new Error('Invalid base64url string: contains invalid characters');
    });
    fromEncodedStructure.mockImplementation(() => {
      throw new Error('not-an-issuer-signed-structure');
    });
    documentDecode.mockReturnValue({
      docType: 'eu.europa.ec.eudi.pid.1',
      issuerSigned: {
        issuerAuth: {
          mobileSecurityObject: {
            docType: 'eu.europa.ec.eudi.pid.1',
            validityInfo: {},
          },
        },
        issuerNamespaces: {
          issuerNamespaces: new Map([['eu.europa.ec.eudi.pid.1', []]]),
        },
        getPrettyClaims: jest.fn().mockReturnValue({ family_name: 'Zhang' }),
      },
    });

    const format = new MdocFormat();
    const parsed = await format.parse('YWJjZA==');

    expect(documentDecode).toHaveBeenCalled();
    expect(parsed.docType).toBe('eu.europa.ec.eudi.pid.1');
    expect(parsed.claims).toEqual({ family_name: 'Zhang' });
  });

  it('当 base64url 入口失败时支持直接从 CBOR structure 构造 IssuerSigned', async () => {
    fromEncodedForOid4Vci.mockImplementation(() => {
      throw new Error('Invalid base64url string: contains invalid characters');
    });
    fromEncodedStructure.mockReturnValue({
      issuerAuth: {
        mobileSecurityObject: {
          docType: 'eu.europa.ec.eudi.pid.1',
          validityInfo: {},
        },
      },
      issuerNamespaces: {
        issuerNamespaces: new Map([['eu.europa.ec.eudi.pid.1', []]]),
      },
      getPrettyClaims: jest.fn().mockReturnValue({ given_name: 'Naraku' }),
    });
    cborDecode.mockReturnValue({
      nameSpaces: {},
      issuerAuth: {},
    });

    const format = new MdocFormat();
    const parsed = await format.parse('YWJjZA==');

    expect(fromEncodedStructure).toHaveBeenCalled();
    expect(parsed.docType).toBe('eu.europa.ec.eudi.pid.1');
    expect(parsed.claims).toEqual({ given_name: 'Naraku' });
  });

  it('会把嵌套 object 递归归一化成 mdoc 需要的 Map 结构', async () => {
    fromEncodedForOid4Vci.mockImplementation(() => {
      throw new Error('Invalid base64url string: contains invalid characters');
    });
    fromEncodedStructure.mockImplementation((encoded) => {
      expect(encoded).toBeInstanceOf(Map);
      expect((encoded as Map<unknown, unknown>).get('nameSpaces')).toBeInstanceOf(Map);
      expect((encoded as Map<unknown, unknown>).get('issuerAuth')).toBeInstanceOf(Map);
      return {
        issuerAuth: {
          mobileSecurityObject: {
            docType: 'eu.europa.ec.eudi.pid.1',
            validityInfo: {},
          },
        },
        issuerNamespaces: {
          issuerNamespaces: new Map(),
        },
        getPrettyClaims: jest.fn(),
      };
    });
    cborDecode.mockReturnValue({
      nameSpaces: {
        'eu.europa.ec.eudi.pid.1': [],
      },
      issuerAuth: {
        payload: {},
      },
    });

    const format = new MdocFormat();
    await format.parse('YWJjZA==');

    expect(fromEncodedStructure).toHaveBeenCalled();
  });

  it('会把 nameSpaces 数组里的 IssuerSignedItem 结构包装成 DataItem', async () => {
    fromEncodedForOid4Vci.mockImplementation(() => {
      throw new Error('Invalid base64url string: contains invalid characters');
    });
    fromEncodedStructure.mockImplementation((encoded) => {
      const nameSpaces = (encoded as Map<unknown, unknown>).get('nameSpaces') as Map<
        unknown,
        unknown
      >;
      const namespaceItems = nameSpaces.get('eu.europa.ec.eudi.pid.1') as Array<unknown>;
      expect(Array.isArray(namespaceItems)).toBe(true);
      expect(namespaceItems[0]).toBeInstanceOf(MockDataItem);
      expect((namespaceItems[0] as MockDataItem).data).toBeInstanceOf(Map);
      return {
        issuerAuth: {
          mobileSecurityObject: {
            docType: 'eu.europa.ec.eudi.pid.1',
            validityInfo: {},
          },
        },
        issuerNamespaces: {
          issuerNamespaces: new Map(),
        },
        getPrettyClaims: jest.fn(),
      };
    });
    cborDecode.mockReturnValue({
      nameSpaces: {
        'eu.europa.ec.eudi.pid.1': [
          {
            digestID: 1,
            random: new Uint8Array([1, 2, 3]),
            elementIdentifier: 'family_name',
            elementValue: 'Zhang',
          },
        ],
      },
      issuerAuth: {},
    });

    const format = new MdocFormat();
    await format.parse('YWJjZA==');

    expect(dataItemFromData).toHaveBeenCalledTimes(1);
  });

  it('当编码态解析失败时支持按解码态手工组装 IssuerSigned', async () => {
    fromEncodedForOid4Vci.mockImplementation(() => {
      throw new Error('Invalid base64url string: contains invalid characters');
    });
    fromEncodedStructure.mockImplementation(() => {
      throw new Error('encoded-structure-still-invalid');
    });
    documentDecode.mockImplementation(() => {
      throw new Error('not-a-document');
    });
    cborDecode.mockReturnValue({
      nameSpaces: {
        'eu.europa.ec.eudi.pid.1': [
          {
            digestID: 1,
            random: new Uint8Array([1, 2, 3]),
            elementIdentifier: 'family_name',
            elementValue: 'Zhang',
          },
        ],
      },
      issuerAuth: [
        new Uint8Array([1]),
        new Map(),
        new Uint8Array([2]),
        new Uint8Array([3]),
      ],
    });

    const format = new MdocFormat();
    const parsed = await format.parse('YWJjZA==');

    expect(issuerSignedItemFromDataItem).toHaveBeenCalledTimes(1);
    expect(issuerNamespacesCreate).toHaveBeenCalledTimes(1);
    expect(issuerAuthFromEncodedStructure).toHaveBeenCalledTimes(1);
    expect(issuerSignedCreate).toHaveBeenCalledTimes(1);
    expect(parsed.docType).toBe('eu.europa.ec.eudi.pid.1');
    expect(parsed.claims).toEqual({ family_name: 'Zhang' });
  });

  it('支持 nameSpaces 数组元素为 Uint8Array 的编码 IssuerSignedItem', async () => {
    fromEncodedForOid4Vci.mockImplementation(() => {
      throw new Error('Invalid base64url string: contains invalid characters');
    });
    fromEncodedStructure.mockImplementation(() => {
      throw new Error('encoded-structure-still-invalid');
    });
    documentDecode.mockImplementation(() => {
      throw new Error('not-a-document');
    });
    cborDecode.mockReturnValue({
      nameSpaces: {
        'eu.europa.ec.eudi.pid.1': [new Uint8Array([0xd8, 0x18, 0xa1])],
      },
      issuerAuth: [
        new Uint8Array([1]),
        new Map(),
        new Uint8Array([2]),
        new Uint8Array([3]),
      ],
    });

    const format = new MdocFormat();
    await format.parse('YWJjZA==');

    expect(issuerSignedItemFromDataItem).toHaveBeenCalledTimes(1);
  });

  it('不会把已解码出来的 DataItem 再错误归一化成空 Map', async () => {
    fromEncodedForOid4Vci.mockImplementation(() => {
      throw new Error('Invalid base64url string: contains invalid characters');
    });
    fromEncodedStructure.mockImplementation(() => {
      throw new Error('encoded-structure-still-invalid');
    });
    documentDecode.mockImplementation(() => {
      throw new Error('not-a-document');
    });
    cborDecode.mockReturnValue({
      nameSpaces: {
        'eu.europa.ec.eudi.pid.1': [new MockDataItem(new Map([['digestID', 1]]))],
      },
      issuerAuth: [
        new Uint8Array([1]),
        new Map(),
        new Uint8Array([2]),
        new Uint8Array([3]),
      ],
    });

    const format = new MdocFormat();
    await format.parse('YWJjZA==');

    expect(issuerSignedItemFromDataItem).toHaveBeenCalledTimes(1);
    expect(issuerSignedItemFromEncodedStructure).not.toHaveBeenCalled();
  });
});
