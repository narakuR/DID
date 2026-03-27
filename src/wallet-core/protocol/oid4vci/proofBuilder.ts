import { didJwkProvider } from '@/wallet-core/did/DidJwkProvider';
import { didKeyProvider } from '@/wallet-core/did/DidKeyProvider';
import { INTEGRATION_CONFIG } from '@/config/integration';
import { oid4vciClient } from './client';

export async function resolveProofSigner(credentialConfigurationId: string): Promise<{
  clientId: string;
  didUrl: string;
  alg: 'EdDSA' | 'ES256';
}> {
  const needsEs256 =
    credentialConfigurationId ===
    INTEGRATION_CONFIG.credentials.ehic.credentialConfigurationId;

  if (needsEs256) {
    let metadata = await didJwkProvider.getStoredMetadata();
    if (!metadata) {
      const created = await didJwkProvider.create();
      metadata = created.metadata;
    }

    return {
      clientId: metadata.did,
      didUrl: metadata.keyId,
      alg: 'ES256',
    };
  }

  const metadata = await didKeyProvider.getStoredMetadata();
  if (!metadata) {
    throw new Error('No active DID found. Please finish wallet setup first.');
  }

  return {
    clientId: metadata.did,
    didUrl: metadata.keyId,
    alg: 'EdDSA',
  };
}

export async function buildCredentialRequestProof(options: {
  issuerMetadata: Parameters<typeof oid4vciClient.requestNonce>[0]['issuerMetadata'];
  credentialConfigurationId: string;
  nonce: string;
}) {
  const proofSigner = await resolveProofSigner(options.credentialConfigurationId);
  return oid4vciClient.createCredentialRequestJwtProof({
    issuerMetadata: options.issuerMetadata,
    credentialConfigurationId: options.credentialConfigurationId,
    nonce: options.nonce,
    clientId: proofSigner.clientId,
    signer: {
      method: 'did',
      didUrl: proofSigner.didUrl,
      alg: proofSigner.alg,
    },
  });
}
