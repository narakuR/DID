import { IssuerSigned } from '@owf/mdoc';
import { IssuerType, type VerifiableCredential } from '@/types';
import type {
  ICredentialFormat,
  ParsedCredential,
  VerifyResult,
} from '@/wallet-core/types/credential';
import { stringToBase64Url } from '@/wallet-core/utils/jwtUtils';

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

export class MdocFormat implements ICredentialFormat {
  readonly name = 'mso_mdoc' as const;

  async parse(raw: string): Promise<ParsedCredential> {
    const issuerSigned = IssuerSigned.fromEncodedForOid4Vci(raw);
    const mso = issuerSigned.issuerAuth.mobileSecurityObject;
    const docType = mso.docType;

    const claims: Record<string, unknown> = {};
    const nsMap: Map<string, unknown> = issuerSigned.issuerNamespaces.issuerNamespaces;
    for (const ns of nsMap.keys()) {
      const nsClaims = issuerSigned.getPrettyClaims(ns);
      if (nsClaims && typeof nsClaims === 'object') {
        Object.assign(claims, nsClaims);
      }
    }

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

    const id = `urn:mso_mdoc:${stringToBase64Url(
      `${parsed.docType ?? 'mdoc'}:${parsed.raw.slice(0, 24)}`
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
