import type { VerifiableCredential } from '@/types';
import type { IDIDProvider } from './did';
import type {
  CredentialFormatName,
  ICredentialFormat,
} from './credential';
import type { WalletProfile } from './profile';
import type { TrustPolicy } from './trust';

export interface IStorageBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface IPluginRegistry {
  registerDIDProvider(provider: IDIDProvider): void;
  registerCredentialFormat(format: ICredentialFormat): void;
  registerProtocolHandler(handler: IProtocolHandler): void;
  registerProfile?(profile: WalletProfile): void;
  registerTrustPolicy?(policy: TrustPolicy): void;
  setStorageBackend(backend: IStorageBackend): void;
  getDIDProvider(method: string): IDIDProvider;
  getCredentialFormat(name: CredentialFormatName): ICredentialFormat;
  getProfile?(id: string): WalletProfile;
  getTrustPolicy?(id: string): TrustPolicy;
  routeProtocol(uri: string): IProtocolHandler | null;
  get storage(): IStorageBackend;
}

export interface ProtocolContext {
  registry: IPluginRegistry;
  credentials: VerifiableCredential[];
  activeDid: string;
}

export interface PendingPresentationRequest {
  verifier: string;
  matches: Array<{
    credential: VerifiableCredential;
    disclosedClaims: string[];
    queryId: string;
  }>;
  presentationId: string;
}

export type ProtocolResult =
  | { type: 'credential_received'; credentials: VerifiableCredential[] }
  | { type: 'presentation_request'; request: PendingPresentationRequest }
  | { type: 'presentation_sent'; verifier: string; verificationResult?: Record<string, unknown> }
  | { type: 'redirect'; url: string }
  | { type: 'error'; message: string };

export interface IProtocolHandler {
  readonly scheme: string;
  canHandle(uri: string): boolean;
  handle(uri: string, ctx: ProtocolContext): Promise<ProtocolResult>;
}
