# T04 — authStore（Zustand 认证状态）

> **阶段**: 1 - 状态管理层
> **依赖**: T02（类型）, T07（storageService）
> **产出文件**: `src/store/authStore.ts`

---

## 任务描述

使用 Zustand 实现认证状态管理，包括 onboarding 状态、锁屏状态、用户资料、云同步状态及持久化。

---

## 实现内容

### 完整 Store 接口

```typescript
import { create } from 'zustand';
import { UserProfile, CloudSyncState } from '@/types';
import { storageService } from '@services/storageService';
import { STORAGE_KEYS } from '@constants/config';

interface AuthState {
  isOnboarded: boolean;
  isLocked: boolean;
  user: UserProfile | null;
  cloudSync: CloudSyncState;
  isHydrated: boolean;

  // Actions
  completeOnboarding: (profile: UserProfile) => Promise<void>;
  unlockWallet: () => void;
  lockWallet: () => void;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
  updateCloudSync: (enabled: boolean, date?: string) => Promise<void>;
  hydrate: () => Promise<void>;  // 从 AsyncStorage 加载状态
}
```

### 关键实现细节

#### hydrate 方法

```typescript
hydrate: async () => {
  const [isOnboarded, user, cloudSync] = await Promise.all([
    storageService.getItem<boolean>(STORAGE_KEYS.IS_ONBOARDED),
    storageService.getItem<UserProfile>(STORAGE_KEYS.USER_PROFILE),
    storageService.getItem<CloudSyncState>(STORAGE_KEYS.CLOUD_SYNC),
  ]);

  set({
    isOnboarded: isOnboarded ?? false,
    isLocked: isOnboarded ?? false,  // 已 onboard 则默认锁定
    user: user ?? null,
    cloudSync: cloudSync ?? { enabled: false, lastSync: null },
    isHydrated: true,
  });
},
```

#### completeOnboarding 方法

```typescript
completeOnboarding: async (profile) => {
  await Promise.all([
    storageService.setItem(STORAGE_KEYS.IS_ONBOARDED, true),
    storageService.setItem(STORAGE_KEYS.USER_PROFILE, profile),
  ]);
  set({ isOnboarded: true, isLocked: false, user: profile });
},
```

#### logout 方法

```typescript
logout: async () => {
  await Promise.all([
    storageService.removeItem(STORAGE_KEYS.IS_ONBOARDED),
    storageService.removeItem(STORAGE_KEYS.USER_PROFILE),
    storageService.removeItem(STORAGE_KEYS.CLOUD_SYNC),
  ]);
  set({
    isOnboarded: false,
    isLocked: false,
    user: null,
    cloudSync: { enabled: false, lastSync: null },
  });
},
```

---

## 重要约束

- PIN 码**不**存入 authStore，由 `biometricService` 通过 `SecureStore` 管理
- `isLocked` 初始值：若 `isOnboarded === true` 则为 `true`（App 启动默认锁定）
- `hydrate` 在 App 根组件 `useEffect` 中调用一次

---

## 验证标准

- [ ] 首次启动：`isOnboarded = false`, `isLocked = false`
- [ ] 完成 onboarding 后：`isOnboarded = true`, `isLocked = false`
- [ ] 重启 App 后：`isOnboarded = true`, `isLocked = true`
- [ ] logout 后：所有状态重置为初始值
