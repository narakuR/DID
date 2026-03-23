import { storageService } from '@/services/storageService';
import type { IStorageBackend } from '../types';

/**
 * Storage backend that delegates to the existing storageService (AsyncStorage).
 *
 * Note: storageService internally JSON-serializes values, so string round-trips
 * correctly: set("k","v") → stored as '"v"' → get("k") → parsed to "v".
 */
export class ExpoStorageBackend implements IStorageBackend {
  async get(key: string): Promise<string | null> {
    return storageService.getItem<string>(key);
  }

  async set(key: string, value: string): Promise<void> {
    await storageService.setItem(key, value);
  }

  async delete(key: string): Promise<void> {
    await storageService.removeItem(key);
  }
}
