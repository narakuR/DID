import type {
  IDIDProvider,
  ICredentialFormat,
  IProtocolHandler,
  IStorageBackend,
  IPluginRegistry,
  CredentialFormatName,
} from './types';

class PluginRegistry implements IPluginRegistry {
  private _didProviders = new Map<string, IDIDProvider>();
  private _formats = new Map<string, ICredentialFormat>();
  private _protocolHandlers: IProtocolHandler[] = [];
  private _storage: IStorageBackend | null = null;

  registerDIDProvider(provider: IDIDProvider): void {
    this._didProviders.set(provider.method, provider);
    if (__DEV__) {
      console.log(`[PluginRegistry] DID provider registered: ${provider.method}`);
    }
  }

  registerCredentialFormat(format: ICredentialFormat): void {
    this._formats.set(format.name, format);
    if (__DEV__) {
      console.log(`[PluginRegistry] Credential format registered: ${format.name}`);
    }
  }

  registerProtocolHandler(handler: IProtocolHandler): void {
    this._protocolHandlers.push(handler);
    if (__DEV__) {
      console.log(`[PluginRegistry] Protocol handler registered: ${handler.scheme}`);
    }
  }

  setStorageBackend(backend: IStorageBackend): void {
    this._storage = backend;
    if (__DEV__) {
      console.log('[PluginRegistry] Storage backend configured');
    }
  }

  getDIDProvider(method: string): IDIDProvider {
    const provider = this._didProviders.get(method);
    if (!provider) {
      throw new Error(`[PluginRegistry] No DID provider registered for method: ${method}`);
    }
    return provider;
  }

  getCredentialFormat(name: CredentialFormatName): ICredentialFormat {
    const format = this._formats.get(name);
    if (!format) {
      throw new Error(`[PluginRegistry] No credential format handler registered for: ${name}`);
    }
    return format;
  }

  routeProtocol(uri: string): IProtocolHandler | null {
    return this._protocolHandlers.find((h) => h.canHandle(uri)) ?? null;
  }

  get storage(): IStorageBackend {
    if (!this._storage) {
      throw new Error('[PluginRegistry] No storage backend configured');
    }
    return this._storage;
  }

  /** DEV-only: log all registered plugins */
  logRegistered(): void {
    if (__DEV__) {
      console.log('[PluginRegistry] === Registered Plugins ===');
      console.log('[PluginRegistry] DID providers:', [...this._didProviders.keys()]);
      console.log('[PluginRegistry] Credential formats:', [...this._formats.keys()]);
      console.log(
        '[PluginRegistry] Protocol handlers:',
        this._protocolHandlers.map((h) => h.scheme)
      );
    }
  }
}

/** Global singleton plugin registry. Initialize in app root before use. */
export const registry = new PluginRegistry();
