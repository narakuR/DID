import type { VerifiableCredential } from '@/types';

// ── DCQL Types ────────────────────────────────────────────────────────────────
// Based on: https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#dcql

export interface DcqlClaimQuery {
  /** JSON path-like array, e.g. ['given_name'] or ['address', 'street'] */
  path: string[];
  /** Optional JSON Schema filter for the value */
  filter?: Record<string, unknown>;
}

export interface DcqlCredentialQuery {
  id: string;
  format?: string;
  claims?: DcqlClaimQuery[];
  /** Alternative claim sets — at least one must be satisfied */
  claim_sets?: DcqlClaimQuery[][];
}

export interface DcqlQuery {
  credentials: DcqlCredentialQuery[];
}

export interface DcqlMatchedCredential {
  queryId: string;
  credential: VerifiableCredential;
  /** Claims that will be disclosed, derived from the query */
  disclosedClaims: string[];
}

export interface DcqlMatchResult {
  matched: DcqlMatchedCredential[];
  /** Query IDs that could not be satisfied */
  unmatched: string[];
}

// ── Matching Logic ────────────────────────────────────────────────────────────

/** Retrieve a nested value from a claims object using a path array */
function getClaimAtPath(
  claims: Record<string, unknown>,
  path: string[]
): unknown {
  let current: unknown = claims;
  for (const key of path) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Check if a value satisfies a JSON Schema-like filter (basic subset) */
function matchesFilter(value: unknown, filter: Record<string, unknown>): boolean {
  if (filter.type === 'string' && typeof value !== 'string') return false;
  if (filter.type === 'number' && typeof value !== 'number') return false;
  if (filter.type === 'boolean' && typeof value !== 'boolean') return false;
  if (filter.const !== undefined && value !== filter.const) return false;
  if (filter.enum && Array.isArray(filter.enum) && !filter.enum.includes(value)) return false;
  if (filter.pattern && typeof value === 'string') {
    try {
      if (!new RegExp(filter.pattern as string).test(value)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

/** Check if a credential satisfies a single set of claim queries */
function satisfiesClaimSet(
  credential: VerifiableCredential,
  claims: DcqlClaimQuery[]
): boolean {
  const subject = credential.credentialSubject as Record<string, unknown>;
  for (const claimQuery of claims) {
    const value = getClaimAtPath(subject, claimQuery.path);
    if (value === undefined) return false;
    if (claimQuery.filter && !matchesFilter(value, claimQuery.filter)) return false;
  }
  return true;
}

/** Check if a credential satisfies a credential query */
function matchCredentialQuery(
  credential: VerifiableCredential,
  query: DcqlCredentialQuery
): boolean {
  // Format match: sd-jwt-vc credentials have vct in their type array
  if (query.format) {
    const credFormat = credential.type.includes('SdJwtVcCredential') ? 'sd-jwt-vc' : 'jwt_vc_json';
    if (credFormat !== query.format) return false;
  }

  // Claim queries
  if (query.claims && query.claims.length > 0) {
    if (!satisfiesClaimSet(credential, query.claims)) return false;
  }

  // Alternative claim sets — at least one must pass
  if (query.claim_sets && query.claim_sets.length > 0) {
    const anySetMatches = query.claim_sets.some((set) => satisfiesClaimSet(credential, set));
    if (!anySetMatches) return false;
  }

  return true;
}

/** Derive the list of claim paths to disclose from a credential query */
function getDisclosedClaims(query: DcqlCredentialQuery): string[] {
  const paths: string[] = [];
  const addPaths = (claimList: DcqlClaimQuery[]) => {
    for (const c of claimList) {
      if (c.path.length > 0) paths.push(c.path[0]);
    }
  };
  if (query.claims) addPaths(query.claims);
  if (query.claim_sets) query.claim_sets.forEach(addPaths);
  return [...new Set(paths)];
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Match a DCQL query against a list of wallet credentials.
 * Returns matched credentials (one per query ID) and unmatched query IDs.
 */
export function matchDcqlQuery(
  query: DcqlQuery,
  credentials: VerifiableCredential[]
): DcqlMatchResult {
  const matched: DcqlMatchedCredential[] = [];
  const unmatched: string[] = [];

  for (const credQuery of query.credentials) {
    const match = credentials.find((vc) => matchCredentialQuery(vc, credQuery));
    if (match) {
      matched.push({
        queryId: credQuery.id,
        credential: match,
        disclosedClaims: getDisclosedClaims(credQuery),
      });
    } else {
      unmatched.push(credQuery.id);
    }
  }

  return { matched, unmatched };
}

/**
 * Parse a raw DCQL JSON object (from a VP request) into a typed DcqlQuery.
 * Returns null if the input is not a valid DCQL query.
 */
export function parseDcqlQuery(raw: unknown): DcqlQuery | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.credentials)) return null;
  return { credentials: obj.credentials as DcqlCredentialQuery[] };
}
