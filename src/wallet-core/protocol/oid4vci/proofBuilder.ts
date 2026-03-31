import { keyManager } from '@/wallet-core/did/KeyManager';
import { oid4vciClient } from './client';
import type { KeyReference } from '@/wallet-core/types/did';
import {
  createPendingMdocBinding,
  loadPendingMdocBinding,
} from '@/wallet-core/domain/DocumentKeyStore';
import { Buffer } from 'buffer';

export async function resolveProofSigner(
  options: {
    credentialConfigurationId: string;
    credentialFormat?: 'sd-jwt-vc' | 'jwt_vc_json' | 'mso_mdoc';
    bindingMethodsSupported?: string[];
    proofSigningAlgValuesSupported?: string[];
  }
): Promise<KeyReference> {
  return keyManager.getCredentialProofKey(options);
}

function toDidSigner(proofSigner: KeyReference) {
  return {
    method: 'did' as const,
    didUrl: proofSigner.keyId,
    alg: proofSigner.alg,
  };
}

export async function buildCredentialRequestProof(options: {
  issuerMetadata: Parameters<typeof oid4vciClient.requestNonce>[0]['issuerMetadata'];
  credentialConfigurationId: string;
  credentialFormat?: 'sd-jwt-vc' | 'jwt_vc_json' | 'mso_mdoc';
  nonce: string;
  bindingMethodsSupported?: string[];
  proofSigningAlgValuesSupported?: string[];
  pendingDocumentKeyId?: string;
}): Promise<{ jwt: string; pendingDocumentKeyId?: string }> {
  if (options.credentialFormat === 'mso_mdoc') {
    const pendingBinding =
      (options.pendingDocumentKeyId
        ? await loadPendingMdocBinding(options.pendingDocumentKeyId)
        : null) ?? (await createPendingMdocBinding());
    const publicJwk = pendingBinding.publicJwk;
    const did = `did:jwk:${Buffer.from(
      JSON.stringify(publicJwk),
      'utf8'
    )
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')}`;

    const proof = await oid4vciClient.createCredentialRequestJwtProof({
      issuerMetadata: options.issuerMetadata,
      credentialConfigurationId: options.credentialConfigurationId,
      nonce: options.nonce,
      clientId: did,
      signer: {
        method: 'jwk' as const,
        alg: 'ES256',
        publicJwk,
        privateJwk: pendingBinding.privateJwk,
        did,
        keyId: `${did}#0`,
      } as never,
    });

    return {
      jwt: proof.jwt,
      pendingDocumentKeyId: pendingBinding.pendingBindingId,
    };
  }

  const proofSigner = await resolveProofSigner({
    credentialConfigurationId: options.credentialConfigurationId,
    credentialFormat: options.credentialFormat,
    bindingMethodsSupported: options.bindingMethodsSupported,
    proofSigningAlgValuesSupported: options.proofSigningAlgValuesSupported,
  });
  return oid4vciClient.createCredentialRequestJwtProof({
    issuerMetadata: options.issuerMetadata,
    credentialConfigurationId: options.credentialConfigurationId,
    nonce: options.nonce,
    clientId: proofSigner.did,
    signer: toDidSigner(proofSigner),
  });
}
