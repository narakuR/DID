import type { VerifiableCredential } from '@/types';
import type { DcqlClaim, DcqlCredentialQuery, RequestObject, StoredPresentationRequest } from './types';

function extractDisclosedClaims(query: DcqlCredentialQuery): string[] {
  return (query?.claims ?? [])
    .map((claim: DcqlClaim) => claim.path?.join('.'))
    .filter((claim: string | undefined): claim is string => Boolean(claim));
}

function normalizeVctCandidate(value: string): string {
  return value.trim().toLowerCase().replace(/^urn:eu\.europa\.ec\./, 'urn:');
}

function normalizeDocTypeCandidate(value: string): string {
  return value.trim().toLowerCase();
}

function matchCredentialQuery(
  credential: VerifiableCredential,
  query: DcqlCredentialQuery
): boolean {
  if (
    query.format &&
    query.format !== 'dc+sd-jwt' &&
    query.format !== 'vc+sd-jwt' &&
    query.format !== 'mso_mdoc'
  ) {
    return false;
  }

  if (query.format === 'mso_mdoc' && credential._format !== 'mso_mdoc') {
    return false;
  }

  if (
    (query.format === 'dc+sd-jwt' || query.format === 'vc+sd-jwt') &&
    credential._format !== 'sd-jwt-vc'
  ) {
    return false;
  }

  if (query.meta?.type) {
    return Array.isArray(credential.type) && credential.type.includes(query.meta.type);
  }

  const requestedDocType = query.meta?.doctype_value;
  if (requestedDocType) {
    const candidates = new Set<string>(
      [
        ...(Array.isArray(credential.type) ? credential.type : []),
        credential.visual?.description ?? '',
        credential.visual?.title ?? '',
      ]
        .filter(Boolean)
        .map((value: string) => normalizeDocTypeCandidate(value))
    );
    return candidates.has(normalizeDocTypeCandidate(requestedDocType));
  }

  const requestedVcts = query.meta?.vct_values ?? [];
  if (requestedVcts.length > 0) {
    const candidates = new Set<string>(
      [
        ...(Array.isArray(credential.type) ? credential.type : []),
        credential.visual?.description ?? '',
      ]
        .filter(Boolean)
        .map((value: string) => normalizeVctCandidate(value))
    );
    return requestedVcts.some((vct: string) =>
      candidates.has(normalizeVctCandidate(vct))
    );
  }

  return true;
}

export function selectMatches(
  requestObject: RequestObject,
  credentials: VerifiableCredential[]
): StoredPresentationRequest['matched'] {
  const queries = requestObject.dcql_query?.credentials ?? [];
  const matches = queries
    .map((query, index) => {
      const credential = credentials.find((item) => matchCredentialQuery(item, query));
      if (!credential) return null;
      return {
        credential,
        disclosedClaims: extractDisclosedClaims(query),
        requestedClaims: query.claims ?? [],
        format: query.format,
        docType: query.meta?.doctype_value,
        queryId: query.id ?? `cred_${index + 1}`,
      };
    });

  return matches.filter((item): item is NonNullable<typeof item> => item !== null);
}
