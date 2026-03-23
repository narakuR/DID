import { registry } from '@/plugins/registry';
import type { ProtocolResult } from '@/plugins/types';
import { useWalletStore } from '@/store/walletStore';
import { didKeyProvider } from '@/plugins/did/DidKeyProvider';
import { oid4vpHandler } from '@/plugins/protocols/Oid4vpHandler';

/**
 * WalletProtocolService
 *
 * Orchestrates protocol handling:
 *  1. Routes a URI to the correct IProtocolHandler via the plugin registry
 *  2. Supplies context (credentials, activeDid) from Zustand stores
 *  3. Persists received credentials back to walletStore
 *
 * Designed to be called from UI (ScanScreen) or deep-link handler (_layout.tsx).
 */
class WalletProtocolService {
  private async _buildCtx() {
    const walletState = useWalletStore.getState();
    const metadata = await didKeyProvider.getStoredMetadata();
    return {
      registry,
      credentials: walletState.credentials,
      activeDid: metadata?.did ?? '',
    };
  }

  /**
   * Process a scanned / deep-linked URI.
   * For OID4VCI: credential is issued and persisted; returns `credential_received`.
   * For OID4VP: returns `presentation_request` — caller must navigate to confirm screen.
   */
  async handleUri(uri: string): Promise<ProtocolResult> {
    const handler = registry.routeProtocol(uri);
    if (!handler) {
      return { type: 'error', message: `No handler registered for URI: ${uri.slice(0, 60)}` };
    }

    const ctx = await this._buildCtx();
    const result = await handler.handle(uri, ctx);

    // Auto-persist issued credentials
    if (result.type === 'credential_received') {
      const { addCredential } = useWalletStore.getState();
      for (const credential of result.credentials) {
        await addCredential(credential);
      }
    }

    return result;
  }

  /**
   * Submit a pending VP presentation after the user confirms.
   * Called from PresentationConfirmScreen after user presses "Share".
   */
  async submitPresentation(presentationId: string): Promise<ProtocolResult> {
    const ctx = await this._buildCtx();
    return oid4vpHandler.submitPresentation(presentationId, ctx);
  }
}

export const walletProtocolService = new WalletProtocolService();
