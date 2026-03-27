import type { StoredCredential, VerifiableCredential } from '@/types';
import type { ProtocolContext, ProtocolResult } from '@/wallet-core/types/contracts';
import type { WalletOperation } from '@/wallet-core/domain/models';

export interface WalletStateSnapshot {
  credentials: VerifiableCredential[];
  activeDid: string;
}

export interface WalletPersistence {
  saveIssuedCredential(record: StoredCredential): Promise<void>;
  addDisplayCredential(credential: VerifiableCredential): Promise<void>;
}

export interface WalletContextDeps {
  loadState(): Promise<WalletStateSnapshot>;
}

export interface WalletFacadeDeps extends WalletContextDeps {
  persistence: WalletPersistence;
}

export interface WalletProtocolFacade {
  handleUri(uri: string): Promise<ProtocolResult>;
  submitPresentation(presentationId: string): Promise<ProtocolResult>;
  handleUriOperation(uri: string): Promise<WalletOperation>;
  submitPresentationOperation(presentationId: string): Promise<WalletOperation>;
  buildProtocolContext(): Promise<ProtocolContext>;
}
