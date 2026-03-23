import { create } from 'zustand';
import { storageService } from '@/services/storageService';
import { STORAGE_KEYS } from '@/constants/config';
import { VerifiableCredential } from '@/types';

interface WalletState {
  credentials: VerifiableCredential[];
  isHydrated: boolean;

  addCredential: (credential: VerifiableCredential) => Promise<void>;
  revokeCredential: (id: string) => Promise<void>;
  updateCredential: (id: string, updates: Partial<VerifiableCredential>) => Promise<void>;
  getCredential: (id: string) => VerifiableCredential | undefined;
  restoreWallet: (credentials: VerifiableCredential[]) => Promise<void>;
  clearWallet: () => Promise<void>;
  hydrate: () => Promise<void>;
}

async function persist(credentials: VerifiableCredential[]) {
  await storageService.setItem(STORAGE_KEYS.CREDENTIALS, credentials);
}

export const useWalletStore = create<WalletState>((set, get) => ({
  credentials: [],
  isHydrated: false,

  addCredential: async (credential) => {
    const updated = [...get().credentials, credential];
    await persist(updated);
    set({ credentials: updated });
  },

  revokeCredential: async (id) => {
    const updated = get().credentials.map((c) =>
      c.id === id ? { ...c, status: 'revoked' as const } : c
    );
    await persist(updated);
    set({ credentials: updated });
  },

  updateCredential: async (id, updates) => {
    const updated = get().credentials.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    await persist(updated);
    set({ credentials: updated });
  },

  getCredential: (id) => get().credentials.find((c) => c.id === id),

  restoreWallet: async (credentials) => {
    await persist(credentials);
    set({ credentials });
  },

  clearWallet: async () => {
    await storageService.removeItem(STORAGE_KEYS.CREDENTIALS);
    set({ credentials: [] });
  },

  hydrate: async () => {
    const saved = await storageService.getItem<VerifiableCredential[]>(STORAGE_KEYS.CREDENTIALS);
    set({
      credentials: saved ?? [],
      isHydrated: true,
    });
  },
}));
