/**
 * didService — compatibility wrapper around DidKeyProvider.
 *
 * All crypto logic has moved to src/plugins/did/DidKeyProvider.ts.
 * This file keeps the existing public API intact so callers don't need changes.
 */
import { didKeyProvider } from '@/plugins/did/DidKeyProvider';
import type { DIDDocument, DIDMetadata } from '@/types';

class DIDService {
  async generateDIDKeyPair(): Promise<{
    did: string;
    metadata: DIDMetadata;
    didDocument: DIDDocument;
  }> {
    const { did, metadata, didDocument } = await didKeyProvider.create();
    return { did, metadata, didDocument };
  }

  async ensureDIDKeyPair(): Promise<{
    did: string;
    metadata: DIDMetadata;
    didDocument: DIDDocument;
    isNew: boolean;
  }> {
    const metadata = await didKeyProvider.getStoredMetadata();
    const didDocument = await didKeyProvider.getStoredDocument();

    if (metadata && didDocument) {
      return { did: metadata.did, metadata, didDocument, isNew: false };
    }

    const generated = await didKeyProvider.create();
    return { ...generated, isNew: true };
  }

  async getDIDMetadata(): Promise<DIDMetadata | null> {
    return didKeyProvider.getStoredMetadata();
  }

  async getDIDDocument(): Promise<DIDDocument | null> {
    const stored = await didKeyProvider.getStoredDocument();
    if (stored) return stored;

    const metadata = await didKeyProvider.getStoredMetadata();
    if (!metadata) return null;
    return didKeyProvider.resolve(metadata.did);
  }

  async exportDIDDocumentToDevice(): Promise<string> {
    return didKeyProvider.exportDocumentToDevice();
  }

  async signWithDID(payload: Uint8Array, keyId?: string): Promise<Uint8Array> {
    const resolvedKeyId = keyId ?? (await didKeyProvider.getStoredMetadata())?.keyId;
    if (!resolvedKeyId) throw new Error('DID 私钥不存在。');
    return didKeyProvider.sign(payload, resolvedKeyId);
  }

  getPrivateKeyLocationHint(keyId: string): { storeKey: string; location: string } {
    return didKeyProvider.getPrivateKeyLocationHint(keyId);
  }

  async getStoredPrivateKeyValue(keyId: string): Promise<string | null> {
    return didKeyProvider.getStoredPrivateKeyValue(keyId);
  }
}

export const didService = new DIDService();
