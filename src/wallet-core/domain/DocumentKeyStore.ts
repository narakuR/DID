import * as SecureStore from 'expo-secure-store';
import * as ExpoCrypto from 'expo-crypto';
import { p256 } from '@noble/curves/nist.js';
import { Buffer } from 'buffer';
import { create } from 'zustand';

import { STORAGE_KEYS, SECURE_STORE_KEYS } from '@/constants/config';
import { storageService } from '@/services/storageService';
import type { DocumentKeyBindingRecord, VerifiableCredential } from '@/types';
import { extractDevicePublicJwkFromRawMdoc } from '@/wallet-core/formats/MdocFormat';

type P256Jwk = {
  kty: 'EC';
  crv: 'P-256';
  x: string;
  y: string;
  d?: string;
};

type PendingDocumentKeyRecord = {
  id: string;
  keyRef: string;
  keyId: string;
  format: 'mso_mdoc';
  docType?: string;
  publicJwk: P256Jwk;
  algorithm: 'ES256';
  createdAt: string;
};

interface DocumentKeyStoreState {
  bindings: Record<string, DocumentKeyBindingRecord>;
  pendingBindings: Record<string, PendingDocumentKeyRecord>;
  hydrate: () => Promise<void>;
  getBinding: (documentId: string) => DocumentKeyBindingRecord | undefined;
  setBinding: (binding: DocumentKeyBindingRecord) => Promise<void>;
  ensureBindingsForCredentials: (credentials: VerifiableCredential[]) => Promise<void>;
  createPendingMdocBinding: (options?: { docType?: string }) => Promise<{
    pendingBindingId: string;
    publicJwk: P256Jwk;
    privateJwk: P256Jwk;
  }>;
  loadPendingMdocBinding: (pendingBindingId: string) => Promise<{
    pendingBindingId: string;
    publicJwk: P256Jwk;
    privateJwk: P256Jwk;
    keyId: string;
  } | null>;
  finalizePendingMdocBinding: (
    pendingBindingId: string,
    credentials: VerifiableCredential[]
  ) => Promise<void>;
  exportPrivateJwkForBinding: (
    binding: DocumentKeyBindingRecord
  ) => Promise<P256Jwk>;
  clear: () => Promise<void>;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const normalized = padded + '='.repeat((4 - (padded.length % 4 || 4)) % 4);
  return Uint8Array.from(Buffer.from(normalized, 'base64'));
}

function stringToBase64Url(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function pubKeyToJwk(pubKeyBytes: Uint8Array): P256Jwk {
  if (pubKeyBytes.length === 65 && pubKeyBytes[0] === 0x04) {
    return {
      kty: 'EC',
      crv: 'P-256',
      x: bytesToBase64Url(pubKeyBytes.slice(1, 33)),
      y: bytesToBase64Url(pubKeyBytes.slice(33, 65)),
    };
  }

  const uncompressed = p256.Point.fromBytes(pubKeyBytes).toBytes(false);
  return {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToBase64Url(uncompressed.slice(1, 33)),
    y: bytesToBase64Url(uncompressed.slice(33, 65)),
  };
}

function privateSeedToJwk(seed: Uint8Array): P256Jwk {
  const publicJwk = pubKeyToJwk(p256.getPublicKey(seed, false));
  return {
    ...publicJwk,
    d: bytesToBase64Url(seed),
  };
}

function publicJwkToDid(publicJwk: P256Jwk): string {
  return `did:jwk:${stringToBase64Url(JSON.stringify(publicJwk))}`;
}

function equalPublicJwk(a: Pick<P256Jwk, 'kty' | 'crv' | 'x' | 'y'>, b: Pick<P256Jwk, 'kty' | 'crv' | 'x' | 'y'>) {
  return a.kty === b.kty && a.crv === b.crv && a.x === b.x && a.y === b.y;
}

function inferMdocDocType(credential: VerifiableCredential): string {
  return (
    credential.type.find((value) => value !== 'VerifiableCredential') ??
    credential.visual?.description ??
    credential.visual?.title ??
    'mso_mdoc'
  );
}

function buildMissingBinding(
  credential: VerifiableCredential,
  reason = 'Document device key is not available on this device.'
): DocumentKeyBindingRecord {
  return {
    documentId: credential.id,
    format: 'mso_mdoc',
    docType: inferMdocDocType(credential),
    bindingType: 'document-device-key',
    strategy: 'stored-document-jwk',
    keyRef: `document:${credential.id}:missing`,
    algorithm: 'ES256',
    state: 'missing_device_key',
    reason,
    updatedAt: new Date().toISOString(),
  };
}

function buildMigrationRequiredBinding(
  credential: VerifiableCredential
): DocumentKeyBindingRecord {
  return {
    documentId: credential.id,
    format: 'mso_mdoc',
    docType: inferMdocDocType(credential),
    bindingType: 'document-device-key',
    strategy: 'linked-did-jwk',
    keyRef: `document:${credential.id}:migration-required`,
    algorithm: 'ES256',
    state: 'migration_required',
    reason:
      'This mdoc was issued before document-bound presentation keys were introduced. Please reissue it on this device.',
    updatedAt: new Date().toISOString(),
  };
}

function secureKeyForDocumentKey(keyRef: string): string {
  return `${SECURE_STORE_KEYS.DOCUMENT_PRIVATE_KEY_PREFIX}${stringToBase64Url(keyRef)}`;
}

export const useDocumentKeyStore = create<DocumentKeyStoreState>((set, get) => ({
  bindings: {},
  pendingBindings: {},

  async hydrate() {
    const storedBindings =
      (await storageService.getItem<Record<string, DocumentKeyBindingRecord>>(
        STORAGE_KEYS.DOCUMENT_KEY_BINDINGS
      )) ?? {};
    const storedPending =
      (await storageService.getItem<Record<string, PendingDocumentKeyRecord>>(
        STORAGE_KEYS.PENDING_DOCUMENT_KEY_BINDINGS
      )) ?? {};

    set({
      bindings: storedBindings,
      pendingBindings: storedPending,
    });
  },

  getBinding(documentId) {
    return get().bindings[documentId];
  },

  async setBinding(binding) {
    const next = { ...get().bindings, [binding.documentId]: binding };
    set({ bindings: next });
    await storageService.setItem(STORAGE_KEYS.DOCUMENT_KEY_BINDINGS, next);
  },

  async ensureBindingsForCredentials(credentials) {
    const current = { ...get().bindings };
    let changed = false;

    for (const credential of credentials) {
      if (credential._format !== 'mso_mdoc') {
        continue;
      }

      const existing = current[credential.id];
      if (!existing) {
        current[credential.id] = buildMissingBinding(credential);
        changed = true;
        continue;
      }

      if (existing.strategy === 'linked-did-jwk') {
        current[credential.id] = buildMigrationRequiredBinding(credential);
        changed = true;
      }
    }

    if (changed) {
      set({ bindings: current });
      await storageService.setItem(STORAGE_KEYS.DOCUMENT_KEY_BINDINGS, current);
    }
  },

  async createPendingMdocBinding(options = {}) {
    const seed = ExpoCrypto.getRandomBytes(32);
    const privateJwk = privateSeedToJwk(seed);
    const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const keyRef = `document-key:${id}`;
    const record: PendingDocumentKeyRecord = {
      id,
      keyRef,
      keyId: `${publicJwkToDid({
        kty: privateJwk.kty,
        crv: privateJwk.crv,
        x: privateJwk.x,
        y: privateJwk.y,
      })}#0`,
      format: 'mso_mdoc',
      docType: options.docType,
      publicJwk: {
        kty: privateJwk.kty,
        crv: privateJwk.crv,
        x: privateJwk.x,
        y: privateJwk.y,
      },
      algorithm: 'ES256',
      createdAt: new Date().toISOString(),
    };

    await SecureStore.setItemAsync(
      secureKeyForDocumentKey(record.keyRef),
      bytesToBase64Url(seed),
      {
        requireAuthentication: true,
        authenticationPrompt: '请验证身份以创建证件展示密钥',
      }
    );

    const nextPending = { ...get().pendingBindings, [record.id]: record };
    set({ pendingBindings: nextPending });
    await storageService.setItem(
      STORAGE_KEYS.PENDING_DOCUMENT_KEY_BINDINGS,
      nextPending
    );

    return {
      pendingBindingId: record.id,
      publicJwk: record.publicJwk,
      privateJwk,
    };
  },

  async loadPendingMdocBinding(pendingBindingId) {
    const pending = get().pendingBindings[pendingBindingId];
    if (!pending) {
      return null;
    }

    const stored = await SecureStore.getItemAsync(
      secureKeyForDocumentKey(pending.keyRef),
      {
        requireAuthentication: true,
        authenticationPrompt: '请验证身份以使用证件展示密钥',
      }
    );
    if (!stored) {
      return null;
    }

    return {
      pendingBindingId,
      publicJwk: pending.publicJwk,
      privateJwk: privateSeedToJwk(base64UrlToBytes(stored)),
      keyId: pending.keyId,
    };
  },

  async finalizePendingMdocBinding(pendingBindingId, credentials) {
    const pending = get().pendingBindings[pendingBindingId];
    if (!pending) {
      return;
    }

    const nextBindings = { ...get().bindings };
    const now = new Date().toISOString();

    for (const credential of credentials) {
      if (credential._format !== 'mso_mdoc') {
        continue;
      }

      const issuedDevicePublicJwk = credential._raw
        ? extractDevicePublicJwkFromRawMdoc(credential._raw)
        : null;
      const issuedKeyMatchesPending =
        issuedDevicePublicJwk &&
        equalPublicJwk(issuedDevicePublicJwk, pending.publicJwk);

      nextBindings[credential.id] = {
        documentId: credential.id,
        format: 'mso_mdoc',
        docType: inferMdocDocType(credential),
        bindingType: 'document-device-key',
        strategy: 'stored-document-jwk',
        keyRef: pending.keyRef,
        keyId: pending.keyId,
        algorithm: 'ES256',
        state: issuedKeyMatchesPending ? 'ready' : 'reissuance_required',
        reason: issuedKeyMatchesPending
          ? undefined
          : 'The issued mdoc device key does not match the local document presentation key. Please reissue this credential on this device.',
        updatedAt: now,
      };
    }

    const nextPending = { ...get().pendingBindings };
    delete nextPending[pendingBindingId];

    set({
      bindings: nextBindings,
      pendingBindings: nextPending,
    });

    await storageService.setItem(STORAGE_KEYS.DOCUMENT_KEY_BINDINGS, nextBindings);
    await storageService.setItem(
      STORAGE_KEYS.PENDING_DOCUMENT_KEY_BINDINGS,
      nextPending
    );
  },

  async exportPrivateJwkForBinding(binding) {
    if (binding.strategy !== 'stored-document-jwk') {
      throw new Error(
        `Unsupported mdoc document key strategy for remote presentation: ${binding.strategy}`
      );
    }

    const stored = await SecureStore.getItemAsync(
      secureKeyForDocumentKey(binding.keyRef),
      {
        requireAuthentication: true,
        authenticationPrompt: '请验证身份以使用证件展示密钥',
      }
    );
    if (!stored) {
      throw new Error('Document device key is not available on this device.');
    }

    return privateSeedToJwk(base64UrlToBytes(stored));
  },

  async clear() {
    const bindings = Object.values(get().bindings);
    const pendingBindings = Object.values(get().pendingBindings);

    for (const binding of bindings) {
      if (binding.strategy === 'stored-document-jwk') {
        await SecureStore.deleteItemAsync(secureKeyForDocumentKey(binding.keyRef));
      }
    }

    for (const pending of pendingBindings) {
      await SecureStore.deleteItemAsync(secureKeyForDocumentKey(pending.keyRef));
    }

    set({ bindings: {}, pendingBindings: {} });
    await storageService.removeItem(STORAGE_KEYS.DOCUMENT_KEY_BINDINGS);
    await storageService.removeItem(STORAGE_KEYS.PENDING_DOCUMENT_KEY_BINDINGS);
  },
}));

export async function hydrateDocumentKeyBindings() {
  await useDocumentKeyStore.getState().hydrate();
}

export function getDocumentKeyBinding(documentId: string) {
  return useDocumentKeyStore.getState().getBinding(documentId);
}

export async function ensureDocumentBindings(credentials: VerifiableCredential[]) {
  await useDocumentKeyStore.getState().ensureBindingsForCredentials(credentials);
}

export async function createPendingMdocBinding(options?: { docType?: string }) {
  return useDocumentKeyStore.getState().createPendingMdocBinding(options);
}

export async function loadPendingMdocBinding(pendingBindingId: string) {
  return useDocumentKeyStore.getState().loadPendingMdocBinding(pendingBindingId);
}

export async function finalizePendingMdocBinding(
  pendingBindingId: string,
  credentials: VerifiableCredential[]
) {
  await useDocumentKeyStore
    .getState()
    .finalizePendingMdocBinding(pendingBindingId, credentials);
}

export async function exportPrivateJwkForBinding(
  binding: DocumentKeyBindingRecord
) {
  return useDocumentKeyStore.getState().exportPrivateJwkForBinding(binding);
}

export async function clearDocumentKeyBindings() {
  await useDocumentKeyStore.getState().clear();
}
