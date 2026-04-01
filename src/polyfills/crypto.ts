import * as ExpoCrypto from 'expo-crypto';

type CryptoWithGetRandomValues = Crypto & {
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
};

function getRandomValues<T extends ArrayBufferView | null>(array: T): T {
  if (!array) {
    return array;
  }

  const view = array as ArrayBufferView & { byteLength: number };
  const bytes = ExpoCrypto.getRandomBytes(view.byteLength);
  new Uint8Array(view.buffer, view.byteOffset, view.byteLength).set(bytes);
  return array;
}

const globalObject = globalThis as typeof globalThis & {
  crypto?: CryptoWithGetRandomValues;
};

if (!globalObject.crypto) {
  globalObject.crypto = { getRandomValues } as unknown as CryptoWithGetRandomValues;
} else if (typeof globalObject.crypto.getRandomValues !== 'function') {
  globalObject.crypto.getRandomValues = getRandomValues;
}

export {};
