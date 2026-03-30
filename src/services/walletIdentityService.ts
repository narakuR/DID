import { didKeyProvider } from '@/wallet-core/did/DidKeyProvider';
import { didJwkProvider } from '@/wallet-core/did/DidJwkProvider';
import { useIdentityStore } from '@/store/identityStore';

class WalletIdentityService {
  private bootstrapPromise: Promise<void> | null = null;

  async ensureReady(): Promise<void> {
    if (this.bootstrapPromise) {
      return this.bootstrapPromise;
    }

    this.bootstrapPromise = this.runBootstrap().finally(() => {
      this.bootstrapPromise = null;
    });

    return this.bootstrapPromise;
  }

  private async runBootstrap(): Promise<void> {
    useIdentityStore.getState().setStatus('initializing');

    try {
      const didKeyMetadata = await didKeyProvider.getStoredMetadata();
      if (!didKeyMetadata) {
        await didKeyProvider.create();
      }

      const didJwkMetadata = await didJwkProvider.getStoredMetadata();
      if (!didJwkMetadata) {
        await didJwkProvider.create();
      }

      useIdentityStore.getState().setStatus('ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      useIdentityStore.getState().setStatus('error', message);
      throw error;
    }
  }
}

export const walletIdentityService = new WalletIdentityService();
