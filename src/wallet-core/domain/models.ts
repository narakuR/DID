import type { IssuerType, VerifiableCredential } from '@/types';
import type { ProtocolResult } from '@/wallet-core/types/contracts';
import {
  classifyCredential,
  WalletDocumentCategory,
} from '@/wallet-core/domain/credentialClassifier';

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

export function toWalletDocument(credential: VerifiableCredential): WalletDocument {
  const classification = classifyCredential(credential);

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
    credential,
  };
}
