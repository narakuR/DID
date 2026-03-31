import type {
  DocumentKeyBindingRecord,
  DocumentKeyBindingState,
  IssuerType,
  VerifiableCredential,
} from '@/types';
import type { ProtocolResult } from '@/wallet-core/types/contracts';
import {
  classifyCredential,
  WalletDocumentCategory,
} from '@/wallet-core/domain/credentialClassifier';
import { getDocumentKeyBinding } from '@/wallet-core/domain/DocumentKeyStore';

export type PresentationSupport = 'supported' | 'unsupported' | 'planned';

export interface WalletDocumentPresentationBinding {
  type: 'holder-key' | 'document-device-key';
  keyRef?: string;
  algorithm?: 'EdDSA' | 'ES256';
}

export interface WalletDocumentPresentationCapabilities {
  remoteOid4vp: PresentationSupport;
  proximity: PresentationSupport;
  reasons: string[];
}

export type WalletDocumentPresentationState =
  | 'ready'
  | 'missing_device_key'
  | 'migration_required'
  | 'reissuance_required';

export interface WalletDocument {
  id: string;
  format: VerifiableCredential['_format'];
  types: string[];
  category: WalletDocumentCategory;
  canonicalType: string;
  displayType: string;
  title: string;
  description?: string;
  issuer: {
    id: string;
    name: string;
    type: IssuerType;
  };
  issuanceDate: string;
  expirationDate: string;
  status: VerifiableCredential['status'];
  presentationCapabilities: WalletDocumentPresentationCapabilities;
  presentationBinding: WalletDocumentPresentationBinding;
  presentationState: WalletDocumentPresentationState;
  documentKeyBinding?: DocumentKeyBindingRecord;
  credential: VerifiableCredential;
}

export interface PendingIssuanceItem {
  id: string;
  uri: string;
  credentialConfigurationId?: string;
  title: string;
  subtitle?: string;
  issuerName: string;
  startedAt: string;
  state: 'issuing';
}

export interface IssuanceSession {
  id: string;
  uri: string;
  status: 'redirect_required' | 'issued' | 'failed';
  redirectUrl?: string;
  documents: WalletDocument[];
  errorMessage?: string;
}

export interface PresentationMatch {
  queryId: string;
  document: WalletDocument;
  disclosedClaims: string[];
}

export interface PresentationSession {
  id: string;
  presentationId: string;
  verifier: string;
  status: 'requested' | 'submitted' | 'failed';
  matches: PresentationMatch[];
  verificationResult?: Record<string, unknown>;
  errorMessage?: string;
}

export type WalletOperation =
  | {
      kind: 'issuance_redirect';
      session: IssuanceSession;
      protocolResult: ProtocolResult;
    }
  | {
      kind: 'issuance_completed';
      session: IssuanceSession;
      protocolResult: ProtocolResult;
    }
  | {
      kind: 'presentation_requested';
      session: PresentationSession;
      protocolResult: ProtocolResult;
    }
  | {
      kind: 'presentation_submitted';
      session: PresentationSession;
      protocolResult: ProtocolResult;
    }
  | {
      kind: 'failure';
      message: string;
      protocolResult: ProtocolResult;
    };

function toPresentationState(
  binding: DocumentKeyBindingRecord | undefined
): WalletDocumentPresentationState {
  if (!binding) return 'missing_device_key';
  return binding.state;
}

function buildPresentationModel(
  credential: VerifiableCredential
): Pick<
  WalletDocument,
  'presentationCapabilities' | 'presentationBinding' | 'presentationState' | 'documentKeyBinding'
> {
  if (credential._format === 'mso_mdoc') {
    const binding = getDocumentKeyBinding(credential.id);
    const state = toPresentationState(binding);
    const reasons = binding?.reason ? [binding.reason] : [];
    return {
      presentationCapabilities: {
        remoteOid4vp: state === 'ready' ? 'supported' : 'unsupported',
        proximity: 'planned',
        reasons,
      },
      presentationBinding: {
        type: 'document-device-key',
        keyRef: binding?.keyRef,
        algorithm: binding?.algorithm,
      },
      presentationState: state,
      documentKeyBinding: binding,
    };
  }

  return {
    presentationCapabilities: {
      remoteOid4vp: 'supported',
      proximity: 'unsupported',
      reasons: [],
    },
    presentationBinding: {
      type: 'holder-key',
      algorithm: credential._format === 'sd-jwt-vc' ? 'EdDSA' : undefined,
    },
    presentationState: 'ready',
    documentKeyBinding: undefined,
  };
}

export function toWalletDocument(credential: VerifiableCredential): WalletDocument {
  const classification = classifyCredential(credential);
  const presentationModel = buildPresentationModel(credential);

  return {
    id: credential.id,
    format: credential._format,
    types: credential.type,
    category: classification.category,
    canonicalType: classification.canonicalType,
    displayType: classification.displayType,
    title: credential.visual?.title ?? classification.displayType,
    description: credential.visual?.description,
    issuer: {
      id: credential.issuer.id,
      name: credential.issuer.name,
      type: credential.issuer.type,
    },
    issuanceDate: credential.issuanceDate,
    expirationDate: credential.expirationDate,
    status: credential.status,
    ...presentationModel,
    credential,
  };
}
