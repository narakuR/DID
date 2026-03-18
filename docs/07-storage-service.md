# T07 — storageService（AsyncStorage 封装）

> **阶段**: 2 - 服务层
> **依赖**: T01（依赖安装）
> **产出文件**: `src/services/storageService.ts`

---

## 任务描述

封装 AsyncStorage 的 JSON 序列化/反序列化操作，提供类型安全的 CRUD 接口。

---

## 实现内容

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

class StorageService {
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`[StorageService] getItem error for key "${key}":`, error);
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`[StorageService] setItem error for key "${key}":`, error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`[StorageService] removeItem error for key "${key}":`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('[StorageService] clear error:', error);
    }
  }

  async multiGet<T>(keys: string[]): Promise<Record<string, T | null>> {
    try {
      const pairs = await AsyncStorage.multiGet(keys);
      return Object.fromEntries(
        pairs.map(([key, value]) => [key, value ? JSON.parse(value) as T : null])
      );
    } catch (error) {
      console.error('[StorageService] multiGet error:', error);
      return {};
    }
  }
}

export const storageService = new StorageService();
```

---

## 验证标准

- [ ] `setItem` + `getItem` 正确序列化/反序列化复杂对象（嵌套对象、数组）
- [ ] `getItem` 在 key 不存在时返回 `null`（不抛出异常）
- [ ] `removeItem` 后 `getItem` 返回 `null`
- [ ] 所有方法在异常时不崩溃，仅 `console.error` 日志
