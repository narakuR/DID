# T18 — LockScreen（锁屏）

> **阶段**: 6 - 屏幕实现
> **依赖**: T04（authStore）, T08（biometricService）, T13（PinPad）, T10（i18n）
> **产出文件**: `src/screens/lock/LockScreen.tsx`

---

## 任务描述

实现锁屏，支持生物识别和 PIN 两种解锁模式，App 启动和从后台切回时展示。

---

## 解锁模式判断

```typescript
const { user, unlockWallet } = useAuthStore();
const authMethod = user?.authMethod ?? 'PIN';
```

---

## 生物识别模式（authMethod === 'BIO'）

```
[Lock 图标（大，蓝色背景圆）]
[标题] t('lock.title')
[描述] t('lock.session_expired')

[大型指纹按钮（圆形，64px）]
  Fingerprint 图标
  点击 → triggerBiometric()
  进入屏幕时自动触发一次

[错误提示]（认证失败时显示）
```

```typescript
const triggerBiometric = async () => {
  const success = await biometricService.authenticate(t('lock.title'));
  if (success) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    unlockWallet();
  } else {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setError('Authentication failed. Please try again.');
  }
};

// 进入屏幕时自动触发
useEffect(() => {
  triggerBiometric();
}, []);
```

---

## PIN 模式（authMethod === 'PIN'）

```
[Lock 图标]
[标题] t('lock.title')

[6个圆点] PinPad 组件
[PinPad 键盘]

输入满 6 位 → 自动验证
  ✅ 正确 → Haptics.Success → unlockWallet()
  ❌ 错误 → Haptics.Error → 圆点变红 + 抖动 + t('lock.pin_error') → 清空
```

```typescript
const handlePinComplete = async (pin: string) => {
  const isValid = await biometricService.verifyPin(pin);
  if (isValid) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    unlockWallet();
  } else {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setError(true);
    // 300ms 后清空并重置错误
    setTimeout(() => {
      setPin('');
      setError(false);
    }, 800);
  }
};
```

---

## 全局样式（全屏，无 Tab 栏）

```typescript
container: {
  flex: 1,
  backgroundColor: theme === 'dark' ? '#111827' : '#F9FAFB',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 32,
}
```

---

## 验证标准

- [ ] 生物识别模式：进入屏幕后自动弹出系统生物识别提示
- [ ] 生物识别成功：`authStore.isLocked` 变为 `false`，页面消失
- [ ] PIN 模式：输入错误 PIN 后圆点变红并抖动
- [ ] PIN 模式：输入正确 PIN 后解锁
- [ ] 两种模式均有触觉反馈
- [ ] 界面无 Tab 导航栏
