# T16 — 自定义 Hooks

> **阶段**: 5 - 基础组件
> **依赖**: T04（authStore）, T08（biometricService）, T10（i18n）
> **产出文件**: `src/hooks/useInactivityTimer.ts`, `src/hooks/useBiometric.ts`

---

## 任务描述

实现 App 级别的非活动计时器 Hook 和生物识别状态管理 Hook。

---

## 1. `src/hooks/useInactivityTimer.ts`

监听 AppState 变化和用户触摸交互，5 分钟无操作后自动锁定。

```typescript
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '@store/authStore';
import { CONFIG } from '@constants/config';

export const useInactivityTimer = () => {
  const { isLocked, lockWallet } = useAuthStore();
  const backgroundTimeRef = useRef<number | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 重置计时器（每次用户有交互时调用）
  const resetTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      lockWallet();
    }, CONFIG.INACTIVITY_LIMIT_MS);
  };

  useEffect(() => {
    if (isLocked) return;

    // 启动前台静止计时器
    resetTimer();

    // 监听 App 状态变化（前台/后台切换）
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'background' || nextState === 'inactive') {
          backgroundTimeRef.current = Date.now();
          if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
          }
        } else if (nextState === 'active') {
          const elapsed = Date.now() - (backgroundTimeRef.current || 0);
          if (elapsed > CONFIG.INACTIVITY_LIMIT_MS) {
            lockWallet();
          } else {
            resetTimer();
          }
          backgroundTimeRef.current = null;
        }
      }
    );

    return () => {
      subscription.remove();
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [isLocked]);

  return { resetTimer };  // 供根组件包装触摸事件用
};
```

**使用方式**（在 App 根组件中）：

```typescript
const { resetTimer } = useInactivityTimer();

// 用 TouchableWithoutFeedback 包裹整个 App，监听任意触摸
<TouchableWithoutFeedback onPress={resetTimer}>
  <View style={{ flex: 1 }}>
    {children}
  </View>
</TouchableWithoutFeedback>
```

---

## 2. `src/hooks/useBiometric.ts`

```typescript
import { useState, useEffect } from 'react';
import { biometricService } from '@services/biometricService';

interface UseBiometricReturn {
  isAvailable: boolean;
  isLoading: boolean;
  authenticate: (promptMessage: string) => Promise<boolean>;
}

export const useBiometric = (): UseBiometricReturn => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    biometricService.isBiometricAvailable().then(setIsAvailable);
  }, []);

  const authenticate = async (promptMessage: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      return await biometricService.authenticate(promptMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return { isAvailable, isLoading, authenticate };
};
```

---

## 验证标准

- [ ] `useInactivityTimer`：App 切后台 5 分钟后切回，`isLocked` 变为 `true`
- [ ] `useInactivityTimer`：App 切后台 1 分钟后切回，`isLocked` 保持 `false`
- [ ] `useInactivityTimer`：锁定状态下（`isLocked=true`）不启动计时器
- [ ] `useBiometric.isAvailable`：模拟器返回 `false`，真机返回 `true`
- [ ] `useBiometric.authenticate`：调用期间 `isLoading=true`，结束后 `isLoading=false`
