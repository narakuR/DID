import { useDocumentStore } from './DocumentStore';
import type { WalletDocument } from './models';
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
}

export const documentManager = new DocumentManager();
