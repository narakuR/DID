import {
  cborDecode as mdocCborDecode,
  DataItem,
  Document,
  IssuerAuth,
  IssuerNamespaces,
  IssuerSigned,
  IssuerSignedItem,
} from '@owf/mdoc';
import { IssuerType, type VerifiableCredential } from '@/types';
import type {
  ICredentialFormat,
  ParsedCredential,
  VerifyResult,
} from '@/wallet-core/types/credential';
import { stringToBase64Url } from '@/wallet-core/utils/jwtUtils';
import { Buffer } from 'buffer';

const DOCTYPE_DISPLAY: Record<string, { title: string; gradientKey: string; issuerType: IssuerType }> =
  {
    'org.iso.18013.5.1.mDL': {
      title: 'Mobile Driving License',
      gradientKey: 'blue',
      issuerType: IssuerType.TRANSPORT,
    },
    'eu.europa.ec.eudi.pid.1': {
      title: 'Personal ID (PID)',
      gradientKey: 'eu',
      issuerType: IssuerType.GOVERNMENT,
    },
    'eu.europa.ec.eudi.mdl.1': {
      title: "Driver's License",
      gradientKey: 'blue',
      issuerType: IssuerType.TRANSPORT,
    },
    'eu.europa.ec.eudi.hiid.1': {
      title: 'Health Insurance',
      gradientKey: 'green',
      issuerType: IssuerType.HEALTH,
    },
  };

function resolveDisplay(docType?: string) {
  if (docType && DOCTYPE_DISPLAY[docType]) return DOCTYPE_DISPLAY[docType];
  const lower = (docType ?? '').toLowerCase();
  if (lower.includes('pid') || lower.includes('identity')) {
    return { title: 'Identity Document', gradientKey: 'eu', issuerType: IssuerType.IDENTITY };
  }
  if (lower.includes('mdl') || lower.includes('license')) {
    return { title: "Driver's License", gradientKey: 'blue', issuerType: IssuerType.TRANSPORT };
  }
  if (lower.includes('health')) {
    return { title: 'Health Card', gradientKey: 'green', issuerType: IssuerType.HEALTH };
  }
  if (lower.includes('edu') || lower.includes('degree')) {
    return { title: 'Education Credential', gradientKey: 'orange', issuerType: IssuerType.EDUCATION };
  }
  return { title: 'mdoc Credential', gradientKey: 'blue', issuerType: IssuerType.IDENTITY };
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function normalizeOid4vciMdocEncoding(raw: string): string {
  const trimmed = raw.trim();
  const withoutPrefix = trimmed.replace(
    /^data:application\/(?:oauth-authz-req\+jwt|[^;,\s]+)?;base64,/i,
    ''
  );

  if (/^[A-Za-z0-9_-]+$/.test(withoutPrefix)) {
    return withoutPrefix;
  }

  if (/^[A-Za-z0-9+/=]+$/.test(withoutPrefix)) {
    return withoutPrefix
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  return withoutPrefix;
}

export function decodeCompactMdocBytes(encoded: string): Uint8Array {
  const normalized = normalizeOid4vciMdocEncoding(encoded);
  const base64 = normalized.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4 || 4)) % 4);
  return Uint8Array.from(Buffer.from(padded, 'base64'));
}

function extractClaims(issuerSigned: IssuerSigned): Record<string, unknown> {
  const claims: Record<string, unknown> = {};
  const nsMap: Map<string, unknown> = issuerSigned.issuerNamespaces.issuerNamespaces;
  for (const ns of nsMap.keys()) {
    const nsClaims = issuerSigned.getPrettyClaims(ns);
    if (nsClaims && typeof nsClaims === 'object') {
      Object.assign(claims, nsClaims);
    }
  }
  return claims;
}

function summarizeCborValue(value: unknown): string {
  if (value instanceof Map) {
    const keys = Array.from(value.keys())
      .slice(0, 8)
      .map((key) => String(key))
      .join(',');
    return `Map(size=${value.size},keys=${keys})`;
  }

  if (Array.isArray(value)) {
    return `Array(len=${value.length})`;
  }

  if (value && typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>)
      .slice(0, 8)
      .join(',');
    return `Object(keys=${keys})`;
  }

  return String(value);
}

export function summarizeCborBytes(bytes: Uint8Array): string {
  const hexPreview = Buffer.from(bytes)
    .toString('hex')
    .slice(0, 64);

  try {
    const decoded = mdocCborDecode(bytes, { unwrapTopLevelDataItem: false });
    return `${summarizeCborValue(decoded)},hex=${hexPreview}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `decodeError=${message},hex=${hexPreview}`;
  }
}

function isIssuerSignedItemEncodedMap(value: unknown): value is Map<unknown, unknown> {
  if (!(value instanceof Map)) {
    return false;
  }

  return (
    value.has('digestID') &&
    value.has('random') &&
    value.has('elementIdentifier') &&
    value.has('elementValue')
  );
}

function normalizeMdocEncodedStructure(value: unknown): unknown {
  if (value instanceof Uint8Array || value instanceof Date || value instanceof DataItem) {
    return value;
  }

  if (value instanceof Map) {
    return new Map(
      Array.from(value.entries()).map(([key, nested]) => [
        key,
        normalizeMdocEncodedStructure(nested),
      ])
    );
  }

  if (Array.isArray(value)) {
    const normalizedItems = value.map((item) => normalizeMdocEncodedStructure(item));
    if (normalizedItems.every((item) => isIssuerSignedItemEncodedMap(item))) {
      return normalizedItems.map((item) => DataItem.fromData(item));
    }
    return normalizedItems;
  }

  if (value && typeof value === 'object') {
    return new Map(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        normalizeMdocEncodedStructure(nested),
      ])
    );
  }

  return value;
}

function toEncodedStructureMap(decoded: unknown): Map<unknown, unknown> | undefined {
  const normalized = normalizeMdocEncodedStructure(decoded);
  if (!(normalized instanceof Map)) {
    return undefined;
  }

  const nameSpaces = normalized.get('nameSpaces');
  if (nameSpaces instanceof Map) {
    const wrappedNameSpaces = new Map<unknown, unknown>();
    for (const [namespace, items] of nameSpaces.entries()) {
      if (Array.isArray(items)) {
        wrappedNameSpaces.set(
          namespace,
          items.map((item) => {
            if (item instanceof Map) {
              return DataItem.fromData(item);
            }
            return item;
          })
        );
      } else {
        wrappedNameSpaces.set(namespace, items);
      }
    }
    normalized.set('nameSpaces', wrappedNameSpaces);
  }

  return normalized;
}

export function buildIssuerSignedFromDecodedCbor(decoded: unknown): IssuerSigned {
  const root = normalizeMdocEncodedStructure(decoded);
  if (!(root instanceof Map)) {
    throw new Error('Decoded CBOR root is not a map-like structure');
  }

  const rawIssuerAuth = root.get('issuerAuth');
  const rawNameSpaces = root.get('nameSpaces');
  const issuerAuthStructure = normalizeMdocEncodedStructure(rawIssuerAuth);
  const nameSpacesMap = normalizeMdocEncodedStructure(rawNameSpaces);

  if (!(issuerAuthStructure instanceof Map) && !Array.isArray(issuerAuthStructure)) {
    throw new Error(
      `Decoded issuerAuth is neither a map-like structure nor a Sign1 tuple (${summarizeCborValue(
        issuerAuthStructure
      )})`
    );
  }

  if (!(nameSpacesMap instanceof Map)) {
    throw new Error('Decoded nameSpaces is not a map-like structure');
  }

  const issuerNamespaces = new Map<string, IssuerSignedItem[]>();

  for (const [namespace, rawItems] of nameSpacesMap.entries()) {
    if (!Array.isArray(rawItems)) {
      throw new Error(`Decoded namespace '${String(namespace)}' is not an array`);
    }

    const items = rawItems.map((rawItem, index) => {
      if (rawItem instanceof DataItem) {
        return IssuerSignedItem.fromDataItem(rawItem);
      }

      if (rawItem instanceof Uint8Array) {
        return IssuerSignedItem.fromDataItem(DataItem.fromBuffer(rawItem));
      }

      const normalizedItem = normalizeMdocEncodedStructure(rawItem);
      if (!(normalizedItem instanceof Map)) {
        throw new Error(
          `Decoded namespace '${String(namespace)}[${index}]' is not a map-like structure (${summarizeCborValue(
            normalizedItem
          )})`
        );
      }

      try {
        return IssuerSignedItem.fromEncodedStructure(normalizedItem);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Decoded namespace '${String(namespace)}[${index}]' could not be parsed as IssuerSignedItem (${summarizeCborValue(
            normalizedItem
          )}): ${message}`
        );
      }
    });

    issuerNamespaces.set(String(namespace), items);
  }

  return IssuerSigned.create({
    issuerAuth: IssuerAuth.fromEncodedStructure(
      issuerAuthStructure as unknown as Parameters<typeof IssuerAuth.fromEncodedStructure>[0]
    ),
    issuerNamespaces: IssuerNamespaces.create({ issuerNamespaces }),
  });
}

export class MdocFormat implements ICredentialFormat {
  readonly name = 'mso_mdoc' as const;

  async parse(raw: string): Promise<ParsedCredential> {
    let issuerSigned: IssuerSigned;
    try {
      issuerSigned = parseIssuerSignedFromRawMdoc(raw);
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : String(parseError);
      throw new Error(message.startsWith('Mdoc') ? message : `Mdoc JSON decode failed. ${message}`);
    }

    let docType: string | undefined = issuerSigned.issuerAuth.mobileSecurityObject.docType;

    const mso = issuerSigned.issuerAuth.mobileSecurityObject;
    docType = docType ?? mso.docType;
    const claims = extractClaims(issuerSigned);

    const validityInfo = mso.validityInfo;
    const issuanceDate = validityInfo.signed instanceof Date
      ? validityInfo.signed.toISOString()
      : undefined;
    const expirationDate = validityInfo.validUntil instanceof Date
      ? validityInfo.validUntil.toISOString()
      : undefined;

    return {
      format: 'mso_mdoc',
      raw,
      claims,
      issuerDid: 'x509',
      docType,
      issuanceDate,
      expirationDate,
    };
  }

  async verify(_raw: string): Promise<VerifyResult> {
    return { valid: true };
  }

  async selectDisclose(raw: string, _claimPaths: string[]): Promise<string> {
    return raw;
  }

  toDisplayModel(parsed: ParsedCredential): VerifiableCredential {
    const display = resolveDisplay(parsed.docType);
    const fingerprint = hashString(
      `${parsed.docType ?? 'mdoc'}|${parsed.issuanceDate ?? ''}|${parsed.expirationDate ?? ''}|${parsed.raw}`
    );

    const id = `urn:mso_mdoc:${stringToBase64Url(
      `${parsed.docType ?? 'mdoc'}:${fingerprint}`
    )}`;

    return {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      id,
      type: ['VerifiableCredential', parsed.docType ?? 'MdocCredential'],
      issuer: {
        id: parsed.issuerDid,
        name: 'mdoc Issuer',
        type: display.issuerType,
      },
      issuanceDate: parsed.issuanceDate ?? new Date().toISOString(),
      expirationDate:
        parsed.expirationDate ?? new Date(Date.now() + 5 * 365 * 864e5).toISOString(),
      credentialSubject: parsed.claims as import('@/types').CredentialSubject,
      status: 'active',
      visual: {
        title: display.title,
        description: parsed.docType,
        gradientKey: display.gradientKey,
      },
    };
  }
}

export function parseIssuerSignedFromRawMdoc(raw: string): IssuerSigned {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const decoded = JSON.parse(trimmed) as unknown;
    return buildIssuerSignedFromDecodedCbor(decoded);
  }

  const encoded = normalizeOid4vciMdocEncoding(raw);

  try {
    return IssuerSigned.fromEncodedForOid4Vci(encoded);
  } catch (error) {
    const bytes = decodeCompactMdocBytes(encoded);
    const rawSummary = summarizeCborBytes(bytes);
    let decoded: unknown;
    let decodedError: unknown = null;

    try {
      decoded = mdocCborDecode(bytes, { unwrapTopLevelDataItem: false });
    } catch (decodeError) {
      decodedError = decodeError;
    }

    try {
      if (decodedError) {
        throw decodedError;
      }
      const encodedStructure = toEncodedStructureMap(decoded);
      if (!encodedStructure) {
        throw new Error('Decoded CBOR root is not a map-like structure');
      }
      return IssuerSigned.fromEncodedStructure(encodedStructure);
    } catch (issuerSignedStructureError) {
      try {
        if (decodedError) {
          throw decodedError;
        }
        return buildIssuerSignedFromDecodedCbor(decoded);
      } catch (decodedIssuerSignedError) {
        try {
          return Document.decode(bytes).issuerSigned;
        } catch (documentError) {
          const issuerSignedMessage =
            error instanceof Error ? error.message : String(error);
          const issuerSignedStructureMessage =
            issuerSignedStructureError instanceof Error
              ? issuerSignedStructureError.message
              : String(issuerSignedStructureError);
          const decodedIssuerSignedMessage =
            decodedIssuerSignedError instanceof Error
              ? decodedIssuerSignedError.message
              : String(decodedIssuerSignedError);
          const documentMessage =
            documentError instanceof Error ? documentError.message : String(documentError);
          throw new Error(
            `Mdoc decode failed. issuerSigned=${issuerSignedMessage}; issuerSignedStructure=${issuerSignedStructureMessage}; decodedIssuerSigned=${decodedIssuerSignedMessage}; document=${documentMessage}; cbor=${rawSummary}`
          );
        }
      }
    }
  }
}
