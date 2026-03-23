import { create } from 'zustand';
import { storageService } from './storageService';
import { STORAGE_KEYS } from '@/constants/config';
import type { StoredCredential } from '@/types';

// ── State ─────────────────────────────────────────────────────────────────────

interface CredentialRepositoryState {
  /** Map of credential id → StoredCredential (in-memory index) */
  _byId: Record<string, StoredCredential>;

  // ── Reads ────────────────────────────────────────────────────────────────

  getById(id: string): StoredCredential | undefined;
  getAll(): StoredCredential[];

  // ── Writes ───────────────────────────────────────────────────────────────

  save(credential: StoredCredential): Promise<void>;
  deleteById(id: string): Promise<void>;

  // ── Persistence ──────────────────────────────────────────────────────────

  /** Load persisted credentials from AsyncStorage into in-memory state. */
  hydrate(): Promise<void>;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useCredentialRepository = create<CredentialRepositoryState>(
  (set, get) => ({
    _byId: {},

    getById(id) {
      return get()._byId[id];
    },

    getAll() {
      return Object.values(get()._byId);
    },

    async save(credential) {
      const next = { ...get()._byId, [credential.id]: credential };
      set({ _byId: next });
      await storageService.setItem(STORAGE_KEYS.STORED_CREDENTIALS, Object.values(next));
    },

    async deleteById(id) {
      const next = { ...get()._byId };
      delete next[id];
      set({ _byId: next });
      await storageService.setItem(STORAGE_KEYS.STORED_CREDENTIALS, Object.values(next));
    },

    async hydrate() {
      const stored = await storageService.getItem<StoredCredential[]>(
        STORAGE_KEYS.STORED_CREDENTIALS
      );
      if (stored && Array.isArray(stored)) {
        const byId: Record<string, StoredCredential> = {};
        for (const c of stored) {
          if (c?.id) byId[c.id] = c;
        }
        set({ _byId: byId });
      }
    },
  })
);

// ── Singleton accessor ────────────────────────────────────────────────────────

/**
 * Imperative accessor for use outside React components (e.g. in protocol handlers).
 * Reads/writes go through the same Zustand store so in-memory state stays in sync.
 */
export const credentialRepository = {
  getById: (id: string) => useCredentialRepository.getState().getById(id),
  getAll: () => useCredentialRepository.getState().getAll(),
  save: (credential: StoredCredential) =>
    useCredentialRepository.getState().save(credential),
  deleteById: (id: string) => useCredentialRepository.getState().deleteById(id),
  hydrate: () => useCredentialRepository.getState().hydrate(),
};
