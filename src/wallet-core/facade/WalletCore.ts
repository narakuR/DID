import { didKeyProvider } from '@/wallet-core/did/DidKeyProvider';
import { walletRegistry } from '@/wallet-core/registry/walletRegistry';
import type { ProtocolContext, ProtocolResult } from '@/wallet-core/types/contracts';
import type { WalletOperation } from '@/wallet-core/domain/models';
import { IssuanceManager } from './IssuanceManager';
import { PresentationManager } from './PresentationManager';
import type { WalletFacadeDeps, WalletProtocolFacade } from './types';

export class WalletCore implements WalletProtocolFacade {
  readonly issuance: IssuanceManager;
  readonly presentation: PresentationManager;

  constructor(private readonly deps: WalletFacadeDeps) {
    this.issuance = new IssuanceManager(deps.persistence);
    this.presentation = new PresentationManager();
  }

  async buildProtocolContext(): Promise<ProtocolContext> {
    const state = await this.deps.loadState();
    const metadata = await didKeyProvider.getStoredMetadata();

    return {
      registry: walletRegistry,
      credentials: state.credentials,
      activeDid: state.activeDid || metadata?.did || '',
    };
  }

  async handleUriOperation(uri: string): Promise<WalletOperation> {
    const handler = walletRegistry.routeProtocol(uri);
    if (!handler) {
      return {
        kind: 'failure',
        message: `No handler registered for URI: ${uri.slice(0, 60)}`,
        protocolResult: {
          type: 'error',
          message: `No handler registered for URI: ${uri.slice(0, 60)}`,
        },
      };
    }

    const ctx = await this.buildProtocolContext();

    if (handler.scheme === 'openid4vp') {
      return this.presentation.handleWithHandler(handler, uri, ctx);
    }

    if (handler.scheme === 'openid-credential-offer') {
      return this.issuance.handleWithHandler(handler, uri, ctx);
    }

    const result = await handler.handle(uri, ctx);
    return {
      kind: 'failure',
      message: result.type === 'error' ? result.message : 'Unsupported protocol handler',
      protocolResult:
        result.type === 'error'
          ? result
          : { type: 'error', message: 'Unsupported protocol handler' },
    };
  }

  async handleUri(uri: string): Promise<ProtocolResult> {
    const operation = await this.handleUriOperation(uri);
    return operation.protocolResult;
  }

  async submitPresentationOperation(presentationId: string): Promise<WalletOperation> {
    const ctx = await this.buildProtocolContext();
    return this.presentation.submit(presentationId, ctx);
  }

  async submitPresentation(presentationId: string): Promise<ProtocolResult> {
    const operation = await this.submitPresentationOperation(presentationId);
    return operation.protocolResult;
  }
}
