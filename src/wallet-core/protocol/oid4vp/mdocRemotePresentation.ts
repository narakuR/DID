import { p256 } from '@noble/curves/nist.js';
import { sha256, sha384, sha512 } from '@noble/hashes/sha2.js';
import {
  CoseKey,
  Curve,
  DeviceResponse,
  DeviceSignedBuilder,
  Document,
  IssuerNamespaces,
  IssuerSigned,
  KeyType,
  SessionTranscript,
  SignatureAlgorithm,
  type CoseKey as CoseKeyType,
  type MdocContext,
} from '@owf/mdoc';

import type { DocumentKeyBindingRecord, VerifiableCredential } from '@/types';
import { exportPrivateJwkForBinding } from '@/wallet-core/domain/DocumentKeyStore';
import { parseIssuerSignedFromRawMdoc } from '@/wallet-core/formats/MdocFormat';
import type { RequestObject } from './types';

type RequestedClaim = { path?: string[] };

function digestBytes(algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512', bytes: Uint8Array) {
  switch (algorithm) {
    case 'SHA-256':
      return sha256(bytes);
    case 'SHA-384':
      return sha384(bytes);
    case 'SHA-512':
      return sha512(bytes);
  }
}

function getMdocContext(): Pick<MdocContext, 'crypto' | 'cose'> {
  return {
    crypto: {
      random: (length) => crypto.getRandomValues(new Uint8Array(length)),
      digest: ({ digestAlgorithm, bytes }) =>
        digestBytes(digestAlgorithm, bytes),
      calculateEphemeralMacKey: () => {
        throw new Error('Mac-based mdoc presentation is not supported in this wallet.');
      },
    },
    cose: {
      sign1: {
        sign: ({ toBeSigned, key }) => {
          const privateKey = key.d;
          if (!privateKey) {
            throw new Error('Document device key is missing private key material.');
          }
          return p256.sign(toBeSigned, privateKey, { lowS: true });
        },
        verify: ({ key, sign1 }) => {
          const publicX = key.x;
          const publicY = key.y;
          if (!publicX || !publicY || !sign1.payload) {
            return false;
          }
          const publicKey = new Uint8Array([0x04, ...publicX, ...publicY]);
          const signature =
            sign1.signature instanceof Uint8Array
              ? sign1.signature
              : new Uint8Array(sign1.signature as ArrayLike<number>);
          return p256.verify(signature, sign1.toBeSigned, publicKey);
        },
      },
      mac0: {
        sign: () => {
          throw new Error('Mac-based mdoc presentation is not supported in this wallet.');
        },
        verify: () => false,
      },
    },
  };
}

function ensureDocumentBinding(
  credential: VerifiableCredential,
  binding: DocumentKeyBindingRecord | undefined
): DocumentKeyBindingRecord {
  if (!binding) {
    throw new Error('This mdoc does not have a document-bound presentation key.');
  }

  if (binding.bindingType !== 'document-device-key') {
    throw new Error('This mdoc is not configured for document-device-key presentation.');
  }

  if (binding.state !== 'ready') {
    throw new Error(
      binding.reason || 'This mdoc is stored but not ready for remote presentation on this device.'
    );
  }

  if (binding.strategy !== 'stored-document-jwk') {
    throw new Error(`Unsupported mdoc key binding strategy: ${binding.strategy}`);
  }

  if (credential._format !== 'mso_mdoc') {
    throw new Error('Remote mdoc presentation requires an mso_mdoc credential.');
  }

  return binding;
}

function buildIssuerSignedSubset(
  issuerSigned: IssuerSigned,
  requestedClaims: RequestedClaim[]
): IssuerSigned {
  if (!requestedClaims.length) {
    return issuerSigned;
  }

  const requestedByNamespace = new Map<string, Set<string>>();

  for (const claim of requestedClaims) {
    const [namespace, elementIdentifier] = claim.path ?? [];
    if (!namespace) {
      continue;
    }
    const bucket = requestedByNamespace.get(namespace) ?? new Set<string>();
    if (elementIdentifier) {
      bucket.add(elementIdentifier);
    }
    requestedByNamespace.set(namespace, bucket);
  }

  if (!requestedByNamespace.size) {
    return issuerSigned;
  }

  const selectedNamespaces = new Map<string, ReturnType<IssuerSigned['getIssuerNamespace']>>();

  for (const [namespace, requestedElements] of requestedByNamespace.entries()) {
    const items = issuerSigned.getIssuerNamespace(namespace);
    if (!items?.length) {
      continue;
    }

    const filtered =
      requestedElements.size === 0
        ? items
        : items.filter((item) => requestedElements.has(item.elementIdentifier));

    if (filtered.length > 0) {
      selectedNamespaces.set(namespace, filtered);
    }
  }

  if (!selectedNamespaces.size) {
    return issuerSigned;
  }

  return IssuerSigned.create({
    issuerAuth: issuerSigned.issuerAuth,
    issuerNamespaces: IssuerNamespaces.create({
      issuerNamespaces: new Map(
        Array.from(selectedNamespaces.entries()).map(([namespace, items]) => [
          namespace,
          items ?? [],
        ])
      ),
    }),
  });
}

async function buildDocumentDeviceKey(binding: DocumentKeyBindingRecord): Promise<CoseKeyType> {
  if (binding.strategy !== 'stored-document-jwk') {
    throw new Error(`Unsupported mdoc key binding strategy: ${binding.strategy}`);
  }

  const privateJwk = await exportPrivateJwkForBinding(binding);
  return CoseKey.fromJwk({
    ...privateJwk,
    kid: binding.keyId ?? binding.keyRef,
    alg: 'ES256',
  });
}

export async function buildMdocRemotePresentation(options: {
  credential: VerifiableCredential;
  rawCredential: string;
  binding: DocumentKeyBindingRecord | undefined;
  requestObject: RequestObject;
  requestedClaims: RequestedClaim[];
  docType?: string;
}): Promise<string> {
  const binding = ensureDocumentBinding(options.credential, options.binding);
  const clientId = options.requestObject.client_id;
  const nonce = options.requestObject.nonce;
  const responseUri =
    options.requestObject.response_uri || options.requestObject.redirect_uri;

  if (!clientId || !nonce || !responseUri) {
    throw new Error('Verifier request is missing client_id, nonce or response_uri for mdoc presentation.');
  }

  const issuerSigned = parseIssuerSignedFromRawMdoc(options.rawCredential);
  const docType =
    options.docType ||
    binding.docType ||
    issuerSigned.issuerAuth.mobileSecurityObject.docType;
  const narrowedIssuerSigned = buildIssuerSignedSubset(
    issuerSigned,
    options.requestedClaims
  );
  const ctx = getMdocContext();
  const signingKey = await buildDocumentDeviceKey(binding);
  const sessionTranscript = await SessionTranscript.forOid4Vp(
    {
      clientId,
      nonce,
      responseUri,
    },
    ctx
  );

  const deviceSigned = await new DeviceSignedBuilder(docType, ctx).sign({
    signingKey,
    algorithm: SignatureAlgorithm.ES256,
    sessionTranscript,
    derCertificate: '',
  });

  const document = Document.create({
    docType,
    issuerSigned: narrowedIssuerSigned,
    deviceSigned,
  });

  return DeviceResponse.createSimple({
    documents: [document],
    status: 0,
  }).encodedForOid4Vp;
}
