import type { ProtocolResult } from '@/wallet-core/types/protocol';
import { useWalletWriteStore } from '@/store/walletWriteStore';
import { credentialRepository } from './credentialRepository';
import { WalletCore } from '@/wallet-core/facade';
import type { WalletOperation } from '@/wallet-core/domain/models';
import { documentManager } from '@/wallet-core/domain/DocumentManager';

/**
 * WalletProtocolService
 *
 * Orchestrates protocol handling:
 *  1. Routes a URI to the correct IProtocolHandler via the plugin registry
 *  2. Supplies context from wallet domain read models
 *  3. Persists received credentials through repository + wallet write store
 *
 * Designed to be called from UI (ScanScreen) or deep-link handler (_layout.tsx).
 */
class WalletProtocolService {
  private readonly walletCore = new WalletCore({
    loadState: async () => {
      const repositoryCredentials = credentialRepository
        .getAll()
        .map((stored) => stored.displayModel);
      const walletDocuments = documentManager.listCredentials();
      const credentials = Array.from(
        new Map(
          [...walletDocuments, ...repositoryCredentials].map((credential) => [
            credential.id,
            credential,
          ])
        ).values()
      );

      return {
        credentials,
        activeDid: '',
      };
    },
    persistence: {
      saveIssuedCredential: (stored) => credentialRepository.save(stored),
      addDisplayCredential: (credential) =>
        useWalletWriteStore.getState().addCredential(credential),
    },
  });

  /**
   * Process a scanned / deep-linked URI.
   * For OID4VCI: credential is issued and persisted; returns `credential_received`.
   * For OID4VP: returns `presentation_request` — caller must navigate to confirm screen.
   */
  async handleUri(uri: string): Promise<ProtocolResult> {
    return this.walletCore.handleUri(uri);
  }

  async handleUriOperation(uri: string): Promise<WalletOperation> {
    return this.walletCore.handleUriOperation(uri);
  }

  /**
   * Submit a pending VP presentation after the user confirms.
   * Called from PresentationConfirmScreen after user presses "Share".
   */
  async submitPresentation(presentationId: string): Promise<ProtocolResult> {
    return this.walletCore.submitPresentation(presentationId);
  }

  async submitPresentationOperation(
    presentationId: string
  ): Promise<WalletOperation> {
    return this.walletCore.submitPresentationOperation(presentationId);
  }
}

export const walletProtocolService = new WalletProtocolService();
