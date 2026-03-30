import { create } from 'zustand';
import type { PendingIssuanceItem } from './models';

interface PendingIssuanceStoreState {
  current: PendingIssuanceItem | null;
  setCurrent: (item: PendingIssuanceItem) => void;
  clearCurrent: () => void;
}

export const usePendingIssuanceStore = create<PendingIssuanceStoreState>((set) => ({
  current: null,
  setCurrent: (item) => set({ current: item }),
  clearCurrent: () => set({ current: null }),
}));

export const pendingIssuanceStore = {
  getCurrent: () => usePendingIssuanceStore.getState().current,
  setCurrent: (item: PendingIssuanceItem) => usePendingIssuanceStore.getState().setCurrent(item),
  clearCurrent: () => usePendingIssuanceStore.getState().clearCurrent(),
};
