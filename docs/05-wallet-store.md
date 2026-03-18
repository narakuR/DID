# T05 — walletStore（Zustand 钱包状态）

> **阶段**: 1 - 状态管理层
> **依赖**: T02（类型）, T03（Mock 数据）, T07（storageService）
> **产出文件**: `src/store/walletStore.ts`

---

## 任务描述

使用 Zustand 管理凭证列表，支持增删改查、撤销、恢复和清空操作，并持久化到 AsyncStorage。

---

## 实现内容

```typescript
import { create } from 'zustand';
import { VerifiableCredential } from '@/types';
import { storageService } from '@services/storageService';
import { STORAGE_KEYS } from '@constants/config';
import { MOCK_CREDENTIALS } from '@constants/mockData';

interface WalletState {
  credentials: VerifiableCredential[];
  isHydrated: boolean;

  // Actions
  addCredential: (credential: VerifiableCredential) => Promise<void>;
  revokeCredential: (id: string) => Promise<void>;
  updateCredential: (id: string, updates: Partial<VerifiableCredential>) => Promise<void>;
  getCredential: (id: string) => VerifiableCredential | undefined;
  restoreWallet: (credentials: VerifiableCredential[]) => Promise<void>;
  clearWallet: () => Promise<void>;
  hydrate: () => Promise<void>;
}
```

### 关键实现细节

#### hydrate 方法

```typescript
hydrate: async () => {
  const stored = await storageService.getItem<VerifiableCredential[]>(STORAGE_KEYS.CREDENTIALS);
  set({
    credentials: stored ?? MOCK_CREDENTIALS,  // 无数据时加载 Mock 数据
    isHydrated: true,
  });
},
```

#### persist 辅助方法（内部使用）

```typescript
const persistCredentials = async (credentials: VerifiableCredential[]) => {
  await storageService.setItem(STORAGE_KEYS.CREDENTIALS, credentials);
};
```

#### revokeCredential

```typescript
revokeCredential: async (id) => {
  const { credentials } = get();
  const updated = credentials.map(c =>
    c.id === id ? { ...c, status: 'revoked' as const } : c
  );
  set({ credentials: updated });
  await persistCredentials(updated);
},
```

#### updateCredential（用于续期）

```typescript
updateCredential: async (id, updates) => {
  const { credentials } = get();
  const updated = credentials.map(c =>
    c.id === id ? { ...c, ...updates } : c
  );
  set({ credentials: updated });
  await persistCredentials(updated);
},
```

---

## 验证标准

- [ ] 首次加载（无 AsyncStorage）：返回 20 条 Mock 数据
- [ ] `revokeCredential` 后，凭证 `status` 变为 `'revoked'`，刷新后持久化
- [ ] `updateCredential` 续期后，`expirationDate` 更新，`status` 恢复 `'active'`
- [ ] `clearWallet` 后，`credentials` 为空数组
- [ ] `restoreWallet` 后，`credentials` 为传入数组
