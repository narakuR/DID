import { didKeyProvider } from '@/wallet-core/did/DidKeyProvider';
import { didJwkProvider } from '@/wallet-core/did/DidJwkProvider';
import { useIdentityStore } from '@/store/identityStore';

class WalletIdentityService {
  private bootstrapPromise: Promise<void> | null = null;

  async ensureReady(interactive = false): Promise<void> {
    if (this.bootstrapPromise) {
      return this.bootstrapPromise;
    }

    this.bootstrapPromise = this.runBootstrap(interactive).finally(() => {
      this.bootstrapPromise = null;
    });

    return this.bootstrapPromise;
  }

  private async runBootstrap(interactive: boolean): Promise<void> {
    useIdentityStore.getState().setStatus('initializing');

    try {
      const didKeyMetadata = await didKeyProvider.getStoredMetadata();
      if (!didKeyMetadata && interactive) {
        await didKeyProvider.create();
      }

      const didJwkMetadata = await didJwkProvider.getStoredMetadata();
      if (!didJwkMetadata && interactive) {
        await didJwkProvider.create();
      }

      if (didKeyMetadata || didJwkMetadata || interactive) {
        const refreshedDidKeyMetadata = didKeyMetadata ?? (await didKeyProvider.getStoredMetadata());
        const refreshedDidJwkMetadata = didJwkMetadata ?? (await didJwkProvider.getStoredMetadata());

        if (refreshedDidKeyMetadata && refreshedDidJwkMetadata) {
          useIdentityStore.getState().setStatus('ready');
          return;
        }
      }

      useIdentityStore.getState().setStatus('idle');
    } catch (error) {
      if (this.isUserCancelledAuthentication(error)) {
        useIdentityStore.getState().setStatus('idle');
        return;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      useIdentityStore.getState().setStatus('error', message);
      throw error;
    }
  }

  private isUserCancelledAuthentication(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.toLowerCase();
    return (
      normalized.includes('user cancelled') ||
      normalized.includes('operation canceled') ||
      normalized.includes('operation cancelled') ||
      normalized.includes('could not authenticate the user')
    );
  }
}

export const walletIdentityService = new WalletIdentityService();
