import { decodeSdJwt, getClaims } from '@sd-jwt/decode';
import { present } from '@sd-jwt/present';
import { sha256 } from '@noble/hashes/sha2.js';
import { IssuerType, type VerifiableCredential } from '@/types';
import type { ICredentialFormat, ParsedCredential, VerifyResult } from '../types';
import { stringToBase64Url } from '../utils/jwtUtils';
import { verifyJwtByIssuerDid } from '../utils/credentialVerify';

// ── SD-JWT hasher (SHA-256 → base64url) ───────────────────────────────────────

async function sdJwtHasher(data: string | ArrayBuffer, _alg: string): Promise<Uint8Array> {
  const input = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  return sha256(input);
}

// ── VCT → display helpers ─────────────────────────────────────────────────────

// Maps standard EUDI/ARF vct values to human-readable titles and gradient keys
const VCT_DISPLAY: Record<string, { title: string; gradientKey: string; issuerType: IssuerType }> =
  {
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
    'org.iso.18013.5.1.mDL': {
      title: 'Mobile Driving License',
      gradientKey: 'purple',
      issuerType: IssuerType.TRANSPORT,
    },
  };

function resolveDisplay(vct?: string, issuerDid?: string) {
  if (vct && VCT_DISPLAY[vct]) return VCT_DISPLAY[vct];
  const lower = (vct ?? issuerDid ?? '').toLowerCase();
  if (lower.includes('pid') || lower.includes('identity'))
    return { title: 'Identity Document', gradientKey: 'eu', issuerType: IssuerType.IDENTITY };
  if (lower.includes('mdl') || lower.includes('license'))
    return { title: "Driver's License", gradientKey: 'blue', issuerType: IssuerType.TRANSPORT };
  if (lower.includes('health'))
    return { title: 'Health Card', gradientKey: 'green', issuerType: IssuerType.HEALTH };
  if (lower.includes('edu') || lower.includes('degree'))
    return { title: 'Education Credential', gradientKey: 'orange', issuerType: IssuerType.EDUCATION };
  return { title: 'Credential', gradientKey: 'blue', issuerType: IssuerType.IDENTITY };
}

// ── Selective-disclosure frame builder ────────────────────────────────────────

/**
 * Convert dot-joined claim paths to the nested presentFrame object required by
 * `@sd-jwt/present`. For example:
 *   ['given_name', 'address.country']
 *   → { given_name: true, address: { country: true } }
 */
type PresentFrame = { [key: string]: boolean | PresentFrame };

function buildPresentFrame(paths: string[]): PresentFrame {
  const frame: PresentFrame = {};
  for (const path of paths) {
    const parts = path.split('.');
    let cur = frame;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) {
        cur[parts[i]] = {};
      }
      cur = cur[parts[i]] as PresentFrame;
    }
    cur[parts[parts.length - 1]] = true;
  }
  return frame;
}

// ── SdJwtVcFormat ─────────────────────────────────────────────────────────────

/**
 * SD-JWT VC credential format handler (supports both `dc+sd-jwt` and `vc+sd-jwt`).
 *
 * Implements the IETF SD-JWT VC draft spec:
 * https://www.ietf.org/archive/id/draft-ietf-oauth-sd-jwt-vc-05.html
 */
export class SdJwtVcFormat implements ICredentialFormat {
  readonly name = 'sd-jwt-vc' as const;

  async parse(raw: string): Promise<ParsedCredential> {
    const { jwt: { payload }, disclosures } = await decodeSdJwt(raw, sdJwtHasher);
    const claims = (await getClaims(payload, disclosures, sdJwtHasher)) as Record<string, unknown>;

    const issuerDid = typeof payload.iss === 'string' ? payload.iss : 'unknown';
    const vct = typeof payload.vct === 'string' ? payload.vct : undefined;

    return {
      format: 'sd-jwt-vc',
      raw,
      claims,
      issuerDid,
      vct,
      issuanceDate:
        typeof payload.iat === 'number'
          ? new Date(payload.iat * 1000).toISOString()
          : undefined,
      expirationDate:
        typeof payload.exp === 'number'
          ? new Date(payload.exp * 1000).toISOString()
          : undefined,
    };
  }

  async verify(raw: string): Promise<VerifyResult> {
    // SD-JWT format: <jwt>~[disclosure1]~[disclosure2]~[kb-jwt]
    // Verify only the issuer's signature on the JWT part (before the first '~').
    const jwtPart = raw.split('~')[0];
    return verifyJwtByIssuerDid(jwtPart);
  }

  /**
   * Rebuild the SD-JWT with only the disclosures matching the requested claim paths.
   * Uses `present()` from @sd-jwt/present for spec-compliant selective disclosure.
   *
   * `claimPaths` are dot-joined paths (e.g. `['given_name', 'address.country']`).
   * These are converted to the nested frame object required by `present()`:
   * `{ given_name: true, address: { country: true } }`.
   */
  async selectDisclose(raw: string, claimPaths: string[]): Promise<string> {
    return present(raw, buildPresentFrame(claimPaths), sdJwtHasher);
  }

  toDisplayModel(parsed: ParsedCredential): VerifiableCredential {
    const display = resolveDisplay(parsed.vct, parsed.issuerDid);
    const { claims } = parsed;

    // Build a stable credential id from the JWT's `jti` or a slice of the raw token
    const jti =
      typeof (parsed.claims as Record<string, unknown>).jti === 'string'
        ? (parsed.claims.jti as string)
        : `urn:sd-jwt:${stringToBase64Url(parsed.raw.slice(0, 32))}`;

    return {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      id: jti,
      type: ['VerifiableCredential', parsed.vct ?? 'SdJwtVcCredential'],
      issuer: {
        id: parsed.issuerDid,
        name: parsed.issuerDid,
        type: display.issuerType,
      },
      issuanceDate: parsed.issuanceDate ?? new Date().toISOString(),
      expirationDate:
        parsed.expirationDate ?? new Date(Date.now() + 5 * 365 * 864e5).toISOString(),
      credentialSubject: claims as import('@/types').CredentialSubject,
      status: 'active',
      visual: {
        title: display.title,
        description: parsed.vct,
        gradientKey: display.gradientKey,
      },
    };
  }
}
