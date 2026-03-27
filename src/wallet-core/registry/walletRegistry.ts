import type {
  CredentialFormatName,
  ICredentialFormat,
} from '@/wallet-core/types/credential';
import type { IDIDProvider } from '@/wallet-core/types/did';
import type {
  IPluginRegistry,
  IProtocolHandler,
  IStorageBackend,
} from '@/wallet-core/types/contracts';
import type { WalletProfile } from '@/wallet-core/types/profile';
import type { TrustPolicy } from '@/wallet-core/types/trust';

export class WalletRegistry implements IPluginRegistry {
  private _didProviders = new Map<string, IDIDProvider>();
  private _formats = new Map<string, ICredentialFormat>();
  private _protocolHandlers: IProtocolHandler[] = [];
  private _profiles = new Map<string, WalletProfile>();
  private _trustPolicies = new Map<string, TrustPolicy>();
  private _storage: IStorageBackend | null = null;

  registerDIDProvider(provider: IDIDProvider): void {
    this._didProviders.set(provider.method, provider);
    if (__DEV__) {
      console.log(`[WalletRegistry] DID provider registered: ${provider.method}`);
    }
  }

  registerCredentialFormat(format: ICredentialFormat): void {
    this._formats.set(format.name, format);
    if (__DEV__) {
      console.log(`[WalletRegistry] Credential format registered: ${format.name}`);
    }
  }

  registerProtocolHandler(handler: IProtocolHandler): void {
    this._protocolHandlers.push(handler);
    if (__DEV__) {
      console.log(`[WalletRegistry] Protocol handler registered: ${handler.scheme}`);
    }
  }

  registerProfile(profile: WalletProfile): void {
    this._profiles.set(profile.id, profile);
    if (__DEV__) {
      console.log(`[WalletRegistry] Profile registered: ${profile.id}`);
    }
  }

  registerTrustPolicy(policy: TrustPolicy): void {
    this._trustPolicies.set(policy.id, policy);
    if (__DEV__) {
      console.log(`[WalletRegistry] Trust policy registered: ${policy.id}`);
    }
  }

  setStorageBackend(backend: IStorageBackend): void {
    this._storage = backend;
    if (__DEV__) {
      console.log('[WalletRegistry] Storage backend configured');
    }
  }

  getDIDProvider(method: string): IDIDProvider {
    const provider = this._didProviders.get(method);
    if (!provider) {
      throw new Error(`[WalletRegistry] No DID provider registered for method: ${method}`);
    }
    return provider;
  }

  getCredentialFormat(name: CredentialFormatName): ICredentialFormat {
    const format = this._formats.get(name);
    if (!format) {
      throw new Error(`[WalletRegistry] No credential format handler registered for: ${name}`);
    }
    return format;
  }

  getProfile(id: string): WalletProfile {
    const profile = this._profiles.get(id);
    if (!profile) {
      throw new Error(`[WalletRegistry] No profile registered for: ${id}`);
    }
    return profile;
  }

  getTrustPolicy(id: string): TrustPolicy {
    const policy = this._trustPolicies.get(id);
    if (!policy) {
      throw new Error(`[WalletRegistry] No trust policy registered for: ${id}`);
    }
    return policy;
  }

  routeProtocol(uri: string): IProtocolHandler | null {
    return this._protocolHandlers.find((handler) => handler.canHandle(uri)) ?? null;
  }

  get storage(): IStorageBackend {
    if (!this._storage) {
      throw new Error('[WalletRegistry] No storage backend configured');
    }
    return this._storage;
  }

  logRegistered(): void {
    if (__DEV__) {
      console.log('[WalletRegistry] === Registered Plugins ===');
      console.log('[WalletRegistry] DID providers:', [...this._didProviders.keys()]);
      console.log('[WalletRegistry] Credential formats:', [...this._formats.keys()]);
      console.log(
        '[WalletRegistry] Protocol handlers:',
        this._protocolHandlers.map((handler) => handler.scheme)
      );
      console.log('[WalletRegistry] Profiles:', [...this._profiles.keys()]);
      console.log('[WalletRegistry] Trust policies:', [...this._trustPolicies.keys()]);
    }
  }
}

export const walletRegistry = new WalletRegistry();
