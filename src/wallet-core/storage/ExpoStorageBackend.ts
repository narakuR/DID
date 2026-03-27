import { storageService } from '@/services/storageService';
import type { IStorageBackend } from '@/wallet-core/types/contracts';

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
