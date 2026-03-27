import { create } from 'zustand';
import { storageService } from '@/services/storageService';
import { STORAGE_KEYS } from '@/constants/config';
import { VerifiableCredential } from '@/types';
import { clearDocuments, syncDocuments } from '@/wallet-core/domain/DocumentStore';

interface WalletWriteState {
  _credentials: VerifiableCredential[];
  isHydrated: boolean;

  addCredential: (credential: VerifiableCredential) => Promise<void>;
  revokeCredential: (id: string) => Promise<void>;
  updateCredential: (id: string, updates: Partial<VerifiableCredential>) => Promise<void>;
  restoreWallet: (credentials: VerifiableCredential[]) => Promise<void>;
  clearWallet: () => Promise<void>;
  hydrate: () => Promise<void>;
}

async function persist(credentials: VerifiableCredential[]) {
  await storageService.setItem(STORAGE_KEYS.CREDENTIALS, credentials);
  syncDocuments(credentials);
}

export const useWalletWriteStore = create<WalletWriteState>((set, get) => ({
  _credentials: [],
  isHydrated: false,

  addCredential: async (credential) => {
    const updated = [...get()._credentials, credential];
    await persist(updated);
    set({ _credentials: updated });
  },

  revokeCredential: async (id) => {
    const updated = get()._credentials.map((c) =>
      c.id === id ? { ...c, status: 'revoked' as const } : c
    );
    await persist(updated);
    set({ _credentials: updated });
  },

  updateCredential: async (id, updates) => {
    const updated = get()._credentials.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    await persist(updated);
    set({ _credentials: updated });
  },

  restoreWallet: async (credentials) => {
    await persist(credentials);
    set({ _credentials: credentials });
  },

  clearWallet: async () => {
    await storageService.removeItem(STORAGE_KEYS.CREDENTIALS);
    clearDocuments();
    set({ _credentials: [] });
  },

  hydrate: async () => {
    const saved = await storageService.getItem<VerifiableCredential[]>(STORAGE_KEYS.CREDENTIALS);
    syncDocuments(saved ?? []);
    set({
      _credentials: saved ?? [],
      isHydrated: true,
    });
  },
}));
