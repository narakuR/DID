// Lazy import so the null-module error only surfaces at call time (inside try-catch),
// not at import time in environments where the native bridge isn't ready.
let _AsyncStorage: typeof import('@react-native-async-storage/async-storage').default | null = null;
function getAS() {
  if (!_AsyncStorage) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      _AsyncStorage = require('@react-native-async-storage/async-storage').default;
    } catch {
      return null;
    }
  }
  return _AsyncStorage;
}

class StorageService {
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const AS = getAS();
      if (!AS) return null;
      const value = await AS.getItem(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (e) {
      console.warn('[StorageService] getItem error:', e);
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const AS = getAS();
      if (!AS) return;
      await AS.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('[StorageService] setItem error:', e);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const AS = getAS();
      if (!AS) return;
      await AS.removeItem(key);
    } catch (e) {
      console.warn('[StorageService] removeItem error:', e);
    }
  }

  async clear(): Promise<void> {
    try {
      const AS = getAS();
      if (!AS) return;
      await AS.clear();
    } catch (e) {
      console.warn('[StorageService] clear error:', e);
    }
  }

  async multiGet<T>(keys: string[]): Promise<Record<string, T | null>> {
    try {
      const AS = getAS();
      if (!AS) return {};
      const pairs = await AS.multiGet(keys);
      const result: Record<string, T | null> = {};
      for (const [key, value] of pairs) {
        result[key] = value ? (JSON.parse(value) as T) : null;
      }
      return result;
    } catch (e) {
      console.warn('[StorageService] multiGet error:', e);
      return {};
    }
  }
}

export const storageService = new StorageService();
