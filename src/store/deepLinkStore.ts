import { create } from 'zustand';
import type { WalletOperation } from '@/wallet-core/domain/models';

/**
 * Lightweight bridge between the deep-link handler in _layout.tsx (outside the
 * React Navigation tree) and the navigators inside RootNavigator.
 *
 * _layout.tsx writes here; TabNavigator reads and clears.
 */
interface DeepLinkStore {
  pending: WalletOperation | null;
  setPending: (result: WalletOperation) => void;
  clear: () => void;
}

export const useDeepLinkStore = create<DeepLinkStore>((set) => ({
  pending: null,
  setPending: (result) => set({ pending: result }),
  clear: () => set({ pending: null }),
}));
