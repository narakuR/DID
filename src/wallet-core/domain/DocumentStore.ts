import { create } from 'zustand';
import type { WalletDocument } from './models';
import { toWalletDocument } from './models';
import type { VerifiableCredential } from '@/types';

interface DocumentStoreState {
  documents: WalletDocument[];
  isHydrated: boolean;
  syncFromCredentials: (credentials: VerifiableCredential[]) => void;
  getDocument: (id: string) => WalletDocument | undefined;
  clear: () => void;
}

export const useDocumentStore = create<DocumentStoreState>((set, get) => ({
  documents: [],
  isHydrated: false,

  syncFromCredentials: (credentials) =>
    set({
      documents: credentials.map(toWalletDocument),
      isHydrated: true,
    }),

  getDocument: (id) => get().documents.find((document) => document.id === id),

  clear: () =>
    set({
      documents: [],
      isHydrated: true,
    }),
}));

export function syncDocuments(credentials: VerifiableCredential[]) {
  useDocumentStore.getState().syncFromCredentials(credentials);
}

export function clearDocuments() {
  useDocumentStore.getState().clear();
}
