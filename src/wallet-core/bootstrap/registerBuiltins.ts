import { walletRegistry } from '@/wallet-core/registry/walletRegistry';
import { didKeyProvider } from '@/wallet-core/did/DidKeyProvider';
import { didJwkProvider } from '@/wallet-core/did/DidJwkProvider';
import { didWebProvider } from '@/wallet-core/did/DidWebProvider';
import { W3cJwtVcFormat } from '@/wallet-core/formats/W3cJwtVcFormat';
import { SdJwtVcFormat } from '@/wallet-core/formats/SdJwtVcFormat';
import { MdocFormat } from '@/wallet-core/formats/MdocFormat';
import { oid4vciHandler } from '@/wallet-core/protocol/oid4vci/Oid4vciHandler';
import { oid4vpHandler } from '@/wallet-core/protocol/oid4vp/Oid4vpHandler';
import { ExpoStorageBackend } from '@/wallet-core/storage/ExpoStorageBackend';

let isRegistered = false;

export function registerWalletBuiltins() {
  if (isRegistered) {
    return walletRegistry;
  }

  walletRegistry.setStorageBackend(new ExpoStorageBackend());
  walletRegistry.registerDIDProvider(didKeyProvider);
  walletRegistry.registerDIDProvider(didJwkProvider);
  walletRegistry.registerDIDProvider(didWebProvider);
  walletRegistry.registerCredentialFormat(new W3cJwtVcFormat());
  walletRegistry.registerCredentialFormat(new SdJwtVcFormat());
  walletRegistry.registerCredentialFormat(new MdocFormat());
  walletRegistry.registerProtocolHandler(oid4vciHandler);
  walletRegistry.registerProtocolHandler(oid4vpHandler);

  if (__DEV__) {
    walletRegistry.logRegistered();
  }

  isRegistered = true;
  return walletRegistry;
}
