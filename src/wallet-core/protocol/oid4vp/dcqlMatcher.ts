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

function matchCredentialQuery(
  credential: VerifiableCredential,
  query: DcqlCredentialQuery
): boolean {
  if (query.format && query.format !== 'dc+sd-jwt' && query.format !== 'vc+sd-jwt') {
    return false;
  }

  if (query.meta?.type) {
    return Array.isArray(credential.type) && credential.type.includes(query.meta.type);
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
  return queries
    .map((query, index) => {
      const credential = credentials.find((item) => matchCredentialQuery(item, query));
      if (!credential) return null;
      return {
        credential,
        disclosedClaims: extractDisclosedClaims(query),
        queryId: query.id ?? `cred_${index + 1}`,
      };
    })
    .filter(
      (
        item
      ): item is {
        credential: VerifiableCredential;
        disclosedClaims: string[];
        queryId: string;
      } => Boolean(item)
    );
}
