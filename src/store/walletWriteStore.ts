import { create } from 'zustand';
import { storageService } from '@/services/storageService';
import { activityLogService } from '@/services/activityLogService';
import { STORAGE_KEYS } from '@/constants/config';
import { VerifiableCredential } from '@/types';
import { clearDocuments, syncDocuments } from '@/wallet-core/domain/DocumentStore';
import {
  clearDocumentKeyBindings,
  ensureDocumentBindings,
  hydrateDocumentKeyBindings,
} from '@/wallet-core/domain/DocumentKeyStore';

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
  await ensureDocumentBindings(credentials);
  await storageService.setItem(STORAGE_KEYS.CREDENTIALS, credentials);
  syncDocuments(credentials);
}

export const useWalletWriteStore = create<WalletWriteState>((set, get) => ({
  _credentials: [],
  isHydrated: false,

  addCredential: async (credential) => {
    const updated = [...get()._credentials, credential];
    await persist(updated);
    await activityLogService.logReceived(credential);
    set({ _credentials: updated });
  },

  revokeCredential: async (id) => {
    const current = get()._credentials;
    const target = current.find((credential) => credential.id === id);
    const updated = current.map((c) =>
      c.id === id ? { ...c, status: 'revoked' as const } : c
    );
    await persist(updated);
    if (target) {
      await activityLogService.logRevoked({ ...target, status: 'revoked' });
    }
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
    await activityLogService.clear();
    await clearDocumentKeyBindings();
    clearDocuments();
    set({ _credentials: [] });
  },

  hydrate: async () => {
    const saved = await storageService.getItem<VerifiableCredential[]>(STORAGE_KEYS.CREDENTIALS);
    const persistedCredentials = (saved ?? []).filter((credential) => !!credential._raw);
    if ((saved?.length ?? 0) !== persistedCredentials.length) {
      await storageService.setItem(STORAGE_KEYS.CREDENTIALS, persistedCredentials);
    }
    await hydrateDocumentKeyBindings();
    await ensureDocumentBindings(persistedCredentials);
    syncDocuments(persistedCredentials);
    set({
      _credentials: persistedCredentials,
      isHydrated: true,
    });
  },
}));
