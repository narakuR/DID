import { create } from 'zustand';

import { STORAGE_KEYS } from '@/constants/config';
import { ActivityLog } from '@/types';
import { storageService } from '@/services/storageService';

interface ActivityLogState {
  logs: ActivityLog[];
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  append: (log: ActivityLog) => Promise<void>;
  clear: () => Promise<void>;
}

async function persist(logs: ActivityLog[]) {
  await storageService.setItem(STORAGE_KEYS.ACTIVITY_LOGS, logs);
}

export const useActivityLogStore = create<ActivityLogState>((set, get) => ({
  logs: [],
  isHydrated: false,

  hydrate: async () => {
    const saved = await storageService.getItem<ActivityLog[]>(STORAGE_KEYS.ACTIVITY_LOGS);
    const logs = Array.isArray(saved) ? saved : [];
    set({ logs, isHydrated: true });
  },

  append: async (log) => {
    const logs = [log, ...get().logs];
    await persist(logs);
    set({ logs });
  },

  clear: async () => {
    await storageService.removeItem(STORAGE_KEYS.ACTIVITY_LOGS);
    set({ logs: [] });
  },
}));
