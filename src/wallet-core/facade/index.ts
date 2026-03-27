export { WalletCore } from './WalletCore';
export { IssuanceManager } from './IssuanceManager';
export { PresentationManager } from './PresentationManager';
export { DocumentManager, documentManager } from '@/wallet-core/domain/DocumentManager';
export { useDocumentStore } from '@/wallet-core/domain/DocumentStore';
export type {
  IssuanceSession,
  PresentationSession,
  WalletDocument,
  WalletOperation,
} from '@/wallet-core/domain/models';
export type {
  WalletContextDeps,
  WalletFacadeDeps,
  WalletPersistence,
  WalletProtocolFacade,
  WalletStateSnapshot,
} from './types';
