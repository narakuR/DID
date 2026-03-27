import { IssuerType, type VerifiableCredential } from '@/types';
import type {
  ICredentialFormat,
  ParsedCredential,
  VerifyResult,
} from '@/wallet-core/types/credential';
import { parseJwtUnsafe } from '@/wallet-core/utils/jwtUtils';
import { verifyJwtByIssuerDid } from '@/wallet-core/utils/credentialVerify';

function inferIssuerType(issuerDid: string): IssuerType {
  const lower = issuerDid.toLowerCase();
  if (lower.includes('gov') || lower.includes('government') || lower.includes('ebsi')) {
    return IssuerType.GOVERNMENT;
  }
  if (lower.includes('edu') || lower.includes('univ') || lower.includes('school')) {
    return IssuerType.EDUCATION;
  }
  if (lower.includes('health') || lower.includes('hospital') || lower.includes('medical')) {
    return IssuerType.HEALTH;
  }
  if (lower.includes('bank') || lower.includes('finance') || lower.includes('payment')) {
    return IssuerType.FINANCIAL;
  }
  if (lower.includes('transport') || lower.includes('vehicle') || lower.includes('license')) {
    return IssuerType.TRANSPORT;
  }
  if (lower.includes('employ') || lower.includes('work') || lower.includes('job')) {
    return IssuerType.EMPLOYMENT;
  }
  return IssuerType.IDENTITY;
}

function inferTitle(type: string[]): string {
  if (type.includes('NationalIDCredential')) return 'National ID Card';
  if (type.includes('DriverLicenseCredential')) return "Driver's License";
  if (type.includes('PassportCredential')) return 'Passport';
  if (type.includes('HealthInsuranceCredential')) return 'Health Insurance Card';
  if (type.includes('UniversityDegreeCredential')) return 'University Degree';
  if (type.includes('VaccinationCredential')) return 'Vaccination Certificate';
  return type.filter((t) => t !== 'VerifiableCredential')[0] ?? 'Credential';
}

export class W3cJwtVcFormat implements ICredentialFormat {
  readonly name = 'jwt_vc_json' as const;

  async parse(raw: string): Promise<ParsedCredential> {
    const { payload } = parseJwtUnsafe(raw);

    const vc = (payload.vc as Record<string, unknown>) ?? {};
    const credentialSubject = (vc.credentialSubject ?? {}) as Record<string, unknown>;
    const issuerValue = payload.iss ?? vc.issuer;
    const issuerDid =
      typeof issuerValue === 'string'
        ? issuerValue
        : (issuerValue as { id?: string })?.id ?? 'unknown';

    return {
      format: 'jwt_vc_json',
      raw,
      claims: credentialSubject,
      issuerDid,
      issuanceDate:
        typeof payload.nbf === 'number'
          ? new Date(payload.nbf * 1000).toISOString()
          : (vc.issuanceDate as string | undefined),
      expirationDate:
        typeof payload.exp === 'number'
          ? new Date(payload.exp * 1000).toISOString()
          : (vc.expirationDate as string | undefined),
    };
  }

  async verify(raw: string): Promise<VerifyResult> {
    return verifyJwtByIssuerDid(raw);
  }

  async selectDisclose(raw: string, _claimPaths: string[]): Promise<string> {
    return raw;
  }

  toDisplayModel(parsed: ParsedCredential): VerifiableCredential {
    const { payload } = parseJwtUnsafe(parsed.raw);
    const vc = (payload.vc as Record<string, unknown>) ?? {};
    const typeArray = (vc.type as string[] | undefined) ?? ['VerifiableCredential'];

    const issuerValue = vc.issuer ?? payload.iss;
    const issuerDid =
      typeof issuerValue === 'string'
        ? issuerValue
        : (issuerValue as { id?: string })?.id ?? 'unknown';
    const issuerName =
      typeof issuerValue === 'object'
        ? ((issuerValue as { name?: string }).name ?? issuerDid)
        : issuerDid;

    return {
      '@context': (vc['@context'] as string[] | undefined) ?? [
        'https://www.w3.org/2018/credentials/v1',
      ],
      id: (payload.jti as string | undefined) ?? parsed.raw.slice(0, 40),
      type: typeArray,
      issuer: {
        id: issuerDid,
        name: issuerName,
        type: inferIssuerType(issuerDid),
      },
      issuanceDate: parsed.issuanceDate ?? new Date().toISOString(),
      expirationDate:
        parsed.expirationDate ?? new Date(Date.now() + 5 * 365 * 864e5).toISOString(),
      credentialSubject: parsed.claims as import('@/types').CredentialSubject,
      status: 'active',
      visual: {
        title: inferTitle(typeArray),
        gradientKey: 'blue',
      },
    };
  }
}
