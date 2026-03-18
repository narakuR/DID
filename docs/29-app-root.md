# T29 — App 根组件、主题系统与 RTL 集成

> **阶段**: 7 - 系统集成
> **依赖**: 所有 T01-T28
> **产出文件**: `src/app/_layout.tsx`, `src/app/index.tsx`（或根入口文件）

---

## 任务描述

整合所有 Provider、初始化 hydrate、配置主题系统、接入非活动计时器，确保 App 完整启动链路。

---

## App 根组件（`src/app/_layout.tsx`）

```typescript
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@store/authStore';
import { useWalletStore } from '@store/walletStore';
import { useSettingsStore } from '@store/settingsStore';
import { useInactivityTimer } from '@hooks/useInactivityTimer';
import { RootNavigator } from '@navigation/RootNavigator';

export default function RootLayout() {
  const hydrateAuth = useAuthStore(s => s.hydrate);
  const hydrateWallet = useWalletStore(s => s.hydrate);
  const hydrateSettings = useSettingsStore(s => s.hydrate);

  useEffect(() => {
    // 并行加载所有持久化状态
    Promise.all([hydrateAuth(), hydrateWallet(), hydrateSettings()]);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const AppContent = () => {
  const { resetTimer } = useInactivityTimer();
  const theme = useSettingsStore(s => s.theme);

  return (
    // 触摸监听用于重置非活动计时器
    <TouchableWithoutFeedback onPress={resetTimer} accessible={false}>
      <View style={[styles.container, { backgroundColor: COLORS[theme].background }]}>
        <StatusBar
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={COLORS[theme].background}
        />
        <RootNavigator />
      </View>
    </TouchableWithoutFeedback>
  );
};
```

---

## 主题系统

### `useTheme` Hook

```typescript
// src/hooks/useTheme.ts
import { useSettingsStore } from '@store/settingsStore';
import { COLORS } from '@constants/colors';

export const useTheme = () => {
  const theme = useSettingsStore(s => s.theme);
  return {
    theme,
    colors: COLORS[theme],
    isDark: theme === 'dark',
  };
};
```

### 每个组件中的使用方式

```typescript
const { colors, isDark } = useTheme();

// 所有颜色从 colors 对象取：
<View style={{ backgroundColor: colors.surface }} />
<Text style={{ color: colors.text }} />
```

### NavigationContainer 主题适配

```typescript
import { DefaultTheme, DarkTheme } from '@react-navigation/native';

const navigationTheme = theme === 'dark'
  ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: COLORS.dark.background } }
  : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: COLORS.light.background } };

<NavigationContainer theme={navigationTheme}>
```

---

## RTL 布局适配规范

在所有 `row` 方向布局中遵守：

```typescript
import { I18nManager } from 'react-native';

// 1. flexDirection
flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row'

// 2. 间距
marginStart: 8,   // 替代 marginLeft（自动 RTL 适配）
marginEnd: 8,     // 替代 marginRight

// 3. 文本对齐
// RN 中 textAlign: 'left' 会自动处理 RTL，无需特殊处理

// 4. ChevronRight 在 RTL 下翻转
transform: I18nManager.isRTL ? [{ scaleX: -1 }] : []
```

---

## Expo StatusBar 配置

```typescript
import { StatusBar } from 'expo-status-bar';

// 随主题变化
<StatusBar style={isDark ? 'light' : 'dark'} />
```

---

## 启动加载状态

```typescript
const isAuthHydrated = useAuthStore(s => s.isHydrated);
const isWalletHydrated = useWalletStore(s => s.isHydrated);
const isSettingsHydrated = useSettingsStore(s => s.isHydrated);

const allHydrated = isAuthHydrated && isWalletHydrated && isSettingsHydrated;

if (!allHydrated) {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color={COLORS.euBlue} />
    </View>
  );
}
```

---

## 触觉反馈汇总

全局统一规范（各处实现时参考）：

| 操作 | 触觉类型 |
|------|---------|
| PIN 输入每位 | `Haptics.selectionAsync()` |
| PIN 错误 | `Haptics.notificationAsync(Error)` |
| PIN 成功/解锁 | `Haptics.notificationAsync(Success)` |
| 接受凭证 | `Haptics.notificationAsync(Success)` |
| 撤销凭证 | `Haptics.impactAsync(Heavy)` |
| Tab 切换 | `Haptics.selectionAsync()` |

---

## 验证标准

- [ ] App 冷启动：加载旋转 → 检查 isOnboarded → 跳转正确屏幕
- [ ] 所有三个 store 并行 hydrate，无顺序依赖
- [ ] 主题切换后：NavigationContainer、StatusBar、所有屏幕同步切换
- [ ] 切换到阿拉伯语后（重启）：所有 row 布局方向正确翻转
- [ ] App 5分钟无操作后自动锁定
- [ ] App 从后台切回（>5分钟）自动锁定
