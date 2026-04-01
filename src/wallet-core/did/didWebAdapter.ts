import { Resolver } from 'did-resolver';
import { getResolver } from 'web-did-resolver';

import type { DIDDocument } from '@/types';

const resolver = new Resolver(getResolver());

function normalizeDidDocument(rawDocument: Record<string, unknown>, timestamp: string): DIDDocument {
  const verificationMethod = Array.isArray(rawDocument.verificationMethod)
    ? rawDocument.verificationMethod
    : [];
  const authentication = Array.isArray(rawDocument.authentication) ? rawDocument.authentication : [];
  const assertionMethod = Array.isArray(rawDocument.assertionMethod) ? rawDocument.assertionMethod : [];
  const context = (Array.isArray(rawDocument['@context'])
    ? rawDocument['@context']
    : ['https://www.w3.org/ns/did/v1']) as ['https://www.w3.org/ns/did/v1', ...string[]];

  return {
    '@context': context,
    id: String(rawDocument.id),
    verificationMethod: verificationMethod.map(method => ({
      id: String((method as Record<string, unknown>).id),
      type: ((method as Record<string, unknown>).type as
        | 'Ed25519VerificationKey2020'
        | 'EcdsaSecp256k1VerificationKey2019'
        | 'JsonWebKey2020') ?? 'JsonWebKey2020',
      controller: String((method as Record<string, unknown>).controller ?? rawDocument.id),
      publicKeyMultibase: String((method as Record<string, unknown>).publicKeyMultibase ?? ''),
      publicKeyJwk: (method as Record<string, unknown>).publicKeyJwk as Record<string, string> | undefined,
    })),
    authentication: authentication.map(String),
    assertionMethod: assertionMethod.map(String),
    created: String(rawDocument.created ?? timestamp),
    updated: String(rawDocument.updated ?? timestamp),
  };
}

export async function resolveDidWebDocument(did: string, timestamp: string): Promise<DIDDocument> {
  const result = await resolver.resolve(did);
  if (!result.didDocument) {
    const error = result.didResolutionMetadata.error ?? 'unknown_error';
    const message = result.didResolutionMetadata.message ?? 'Unable to resolve did:web document';
    throw new Error(`Failed to resolve did:web document for ${did}: ${error}${message ? ` - ${message}` : ''}`);
  }

  const normalized = normalizeDidDocument(result.didDocument as Record<string, unknown>, timestamp);
  if (!normalized.id || normalized.verificationMethod.length === 0) {
    throw new Error(`Invalid DID document resolved for ${did}`);
  }

  return normalized;
}
