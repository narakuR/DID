import { create } from 'zustand';
import { storageService } from '@/services/storageService';
import { STORAGE_KEYS } from '@/constants/config';
import { UserProfile, CloudSyncState, AuthMethod } from '@/types';

interface AuthState {
  isOnboarded: boolean;
  isLocked: boolean;
  user: UserProfile | null;
  cloudSync: CloudSyncState;
  isHydrated: boolean;

  completeOnboarding: (user: UserProfile) => Promise<void>;
  unlockWallet: () => void;
  lockWallet: () => void;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
  updateCloudSync: (enabled: boolean, lastSyncAt?: string | null) => Promise<void>;
  hydrate: () => Promise<void>;
}

interface PersistedAuthState {
  isOnboarded: boolean;
  user: UserProfile | null;
  cloudSync: CloudSyncState;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isOnboarded: false,
  isLocked: false,
  user: null,
  cloudSync: { enabled: false, lastSyncAt: null },
  isHydrated: false,

  completeOnboarding: async (user) => {
    const newState: PersistedAuthState = {
      isOnboarded: true,
      user,
      cloudSync: get().cloudSync,
    };
    await storageService.setItem(STORAGE_KEYS.AUTH_STATE, newState);
    set({ isOnboarded: true, isLocked: false, user });
  },

  unlockWallet: () => set({ isLocked: false }),

  lockWallet: () => set({ isLocked: true }),

  logout: async () => {
    await storageService.removeItem(STORAGE_KEYS.AUTH_STATE);
    set({
      isOnboarded: false,
      isLocked: false,
      user: null,
      cloudSync: { enabled: false, lastSyncAt: null },
    });
  },

  updateUser: async (updates) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...updates };
    const persisted: PersistedAuthState = {
      isOnboarded: get().isOnboarded,
      user: updated,
      cloudSync: get().cloudSync,
    };
    await storageService.setItem(STORAGE_KEYS.AUTH_STATE, persisted);
    set({ user: updated });
  },

  updateCloudSync: async (enabled, lastSyncAt = null) => {
    const cloudSync: CloudSyncState = { enabled, lastSyncAt: lastSyncAt ?? new Date().toISOString() };
    const persisted: PersistedAuthState = {
      isOnboarded: get().isOnboarded,
      user: get().user,
      cloudSync,
    };
    await storageService.setItem(STORAGE_KEYS.AUTH_STATE, persisted);
    set({ cloudSync });
  },

  hydrate: async () => {
    const saved = await storageService.getItem<PersistedAuthState>(STORAGE_KEYS.AUTH_STATE);
    if (saved) {
      set({
        isOnboarded: saved.isOnboarded,
        user: saved.user,
        cloudSync: saved.cloudSync ?? { enabled: false, lastSyncAt: null },
        // wallet is locked on cold start when already onboarded
        isLocked: saved.isOnboarded,
        isHydrated: true,
      });
    } else {
      set({ isHydrated: true });
    }
  },
}));
