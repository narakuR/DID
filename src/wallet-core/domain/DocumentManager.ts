import { useDocumentStore } from './DocumentStore';
import type {
  WalletDocument,
  WalletDocumentPresentationCapabilities,
  WalletDocumentPresentationState,
} from './models';
import type { VerifiableCredential } from '@/types';

export class DocumentManager {
  listDocuments(): WalletDocument[] {
    return useDocumentStore.getState().documents;
  }

  getDocument(documentId: string): WalletDocument | undefined {
    return useDocumentStore.getState().getDocument(documentId);
  }

  listCredentials(): VerifiableCredential[] {
    return this.listDocuments().map((document) => document.credential);
  }

  getCredential(documentId: string): VerifiableCredential | undefined {
    return this.getDocument(documentId)?.credential;
  }

  getPresentationCapabilities(
    documentId: string
  ): WalletDocumentPresentationCapabilities | undefined {
    return this.getDocument(documentId)?.presentationCapabilities;
  }

  getPresentationState(
    documentId: string
  ): WalletDocumentPresentationState | undefined {
    return this.getDocument(documentId)?.presentationState;
  }

  canPresentRemotely(documentId: string): boolean {
    return this.getDocument(documentId)?.presentationCapabilities.remoteOid4vp === 'supported';
  }
}

export const documentManager = new DocumentManager();
