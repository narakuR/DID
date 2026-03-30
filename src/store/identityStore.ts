import { create } from 'zustand';

type IdentityStatus = 'idle' | 'initializing' | 'ready' | 'error';

interface IdentityState {
  status: IdentityStatus;
  errorMessage?: string;
  setStatus: (status: IdentityStatus, errorMessage?: string) => void;
}

export const useIdentityStore = create<IdentityState>((set) => ({
  status: 'idle',
  errorMessage: undefined,
  setStatus: (status, errorMessage) => set({ status, errorMessage }),
}));
