import { INTEGRATION_CONFIG } from '@/config/integration';
import { didJwkProvider } from '@/wallet-core/did/DidJwkProvider';
import { didKeyProvider } from '@/wallet-core/did/DidKeyProvider';
import type { DIDMetadata } from '@/types';
import type { KeyReference } from '@/wallet-core/types/did';

async function requireDidKeyMetadata(): Promise<DIDMetadata> {
  const metadata = await didKeyProvider.getStoredMetadata();
  if (!metadata) {
    throw new Error('No active DID found. Please finish wallet setup first.');
  }
  return metadata;
}

async function requireDidJwkMetadata(): Promise<DIDMetadata> {
  let metadata = await didJwkProvider.getStoredMetadata();
  if (!metadata) {
    const created = await didJwkProvider.create();
    metadata = created.metadata;
  }
  return metadata;
}

export class KeyManager {
  async getCredentialProofKey(options: {
    credentialConfigurationId: string;
    credentialFormat?: 'sd-jwt-vc' | 'jwt_vc_json' | 'mso_mdoc';
    bindingMethodsSupported?: string[];
    proofSigningAlgValuesSupported?: string[];
  }): Promise<KeyReference> {
    const bindingMethods = options.bindingMethodsSupported ?? [];
    const proofAlgs = options.proofSigningAlgValuesSupported ?? [];
    const supportsDidJwk =
      bindingMethods.length === 0 ||
      bindingMethods.includes('did:jwk') ||
      bindingMethods.includes('jwk');
    const supportsDidKey =
      bindingMethods.length === 0 || bindingMethods.includes('did:key');
    const supportsEs256 = proofAlgs.includes('ES256');
    const supportsEdDsa = proofAlgs.length === 0 || proofAlgs.includes('EdDSA');
    const rejectsDidJwk = bindingMethods.length > 0 && !supportsDidJwk;
    const prefersEs256 = supportsEs256;

    const fallbackToEhicRule =
      options.credentialConfigurationId ===
      INTEGRATION_CONFIG.credentials.ehic.credentialConfigurationId;
    const fallbackToMdocRule =
      options.credentialFormat === 'mso_mdoc' ||
      options.credentialConfigurationId.toLowerCase().includes('mdoc');

    if (fallbackToMdocRule) {
      const metadata = await requireDidJwkMetadata();
      return {
        did: metadata.did,
        keyId: metadata.keyId,
        alg: 'ES256',
        method: 'did:jwk',
      };
    }

    if (!rejectsDidJwk && (prefersEs256 || fallbackToEhicRule)) {
      const metadata = await requireDidJwkMetadata();
      return {
        did: metadata.did,
        keyId: metadata.keyId,
        alg: 'ES256',
        method: 'did:jwk',
      };
    }

    if (supportsDidKey && supportsEdDsa) {
      const metadata = await requireDidKeyMetadata();
      return {
        did: metadata.did,
        keyId: metadata.keyId,
        alg: 'EdDSA',
        method: 'did:key',
      };
    }

    throw new Error(
      'Issuer credential configuration does not support a compatible proof key binding method.'
    );
  }

  async getSdJwtKeyBindingKey(options: {
    cnf?: { jwk?: { kty?: string; crv?: string } };
  }): Promise<KeyReference> {
    if (options.cnf?.jwk?.kty === 'EC' && options.cnf.jwk.crv === 'P-256') {
      const metadata = await didJwkProvider.getStoredMetadata();
      if (!metadata) {
        throw new Error('Missing DID:JWK key required for SD-JWT key binding');
      }
      return {
        did: metadata.did,
        keyId: metadata.keyId,
        alg: 'ES256',
        method: 'did:jwk',
      };
    }

    const metadata = await didKeyProvider.getStoredMetadata();
    if (!metadata) {
      throw new Error('Missing DID:key required for SD-JWT key binding');
    }
    return {
      did: metadata.did,
      keyId: metadata.keyId,
      alg: 'EdDSA',
      method: 'did:key',
    };
  }
}

export const keyManager = new KeyManager();
