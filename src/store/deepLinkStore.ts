import { create } from 'zustand';
import type { ProtocolResult } from '@/plugins/types';

/**
 * Lightweight bridge between the deep-link handler in _layout.tsx (outside the
 * React Navigation tree) and the navigators inside RootNavigator.
 *
 * _layout.tsx writes here; TabNavigator reads and clears.
 */
interface DeepLinkStore {
  pending: ProtocolResult | null;
  setPending: (result: ProtocolResult) => void;
  clear: () => void;
}

export const useDeepLinkStore = create<DeepLinkStore>((set) => ({
  pending: null,
  setPending: (result) => set({ pending: result }),
  clear: () => set({ pending: null }),
}));
