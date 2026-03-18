# T17 — OnboardingScreen（7 步引导流程）

> **阶段**: 6 - 屏幕实现
> **依赖**: T04（authStore）, T05（walletStore）, T08（biometricService）, T13（PinPad）, T10（i18n）
> **产出文件**: `src/screens/onboarding/OnboardingScreen.tsx`

---

## 任务描述

实现 7 步 Onboarding 引导流程状态机，包括欢迎、认证选择、PIN 设置、手机验证、云备份恢复和完成步骤。

---

## 状态机定义

```typescript
type OnboardingStep =
  | 'WELCOME'
  | 'AUTH_SELECT'
  | 'BIO_SETUP'
  | 'PIN_SETUP'
  | 'PHONE'
  | 'RESTORE_PASSWORD'
  | 'RESTORE_PROGRESS'
  | 'SUCCESS';

// 流程路径
// 生物识别：WELCOME → AUTH_SELECT → BIO_SETUP → PHONE → RESTORE_PASSWORD → RESTORE_PROGRESS → SUCCESS
// PIN：      WELCOME → AUTH_SELECT → PIN_SETUP → PHONE → RESTORE_PASSWORD → RESTORE_PROGRESS → SUCCESS
// 跳过恢复：...→ PHONE → SUCCESS（跳过 RESTORE 步骤）
```

---

## 各步骤实现规格

### Step 1: WELCOME

```
[ShieldCheck 图标，蓝色圆角方块背景，64×64]
[大标题] t('onboard.welcome_title')
[描述文字] t('onboard.welcome_desc')
[主按钮] t('onboard.start') → setStep('AUTH_SELECT')
```

### Step 2: AUTH_SELECT

```
[标题] t('onboard.step_auth')

[选项卡 1：生物识别]
  Fingerprint 图标 | t('onboard.use_bio') | FaceID / TouchID
  点击后：
    1. 调用 biometricService.isBiometricAvailable()
    2. 若支持：显示 BIO_SETUP（模拟扫描动画 1.5s）→ PHONE
    3. 若不支持：Toast 提示 → 切换到 PIN_SETUP

[选项卡 2：PIN 码]
  Lock 图标 | t('onboard.use_pin')
  点击 → setStep('PIN_SETUP')
```

### Step 3: BIO_SETUP（短暂过渡）

```
[Fingerprint 图标 + pulse 动画]
[文字] "Setting up biometrics..."
1.5s 后自动进入 PHONE
```

### Step 4: PIN_SETUP

状态：`'enter' | 'confirm'`

**enter 阶段**：
```
[标题] t('onboard.pin_setup')
[6个圆点] PinPad 组件
[PinPad 键盘]
输入满 6 位 → 保存到 tempPin → 切换到 confirm 阶段
```

**confirm 阶段**：
```
[标题] t('onboard.pin_confirm')
[6个圆点] 重置清空
[PinPad 键盘]
[确认按钮（6位时激活）]
确认：比对 tempPin
  ✅ 一致 → biometricService.savePin(pin) → setStep('PHONE')
  ❌ 不一致 → error 动画 + t('onboard.pin_mismatch') + 清空重试
```

### Step 5: PHONE

```typescript
interface PhoneState {
  phoneNumber: string;
  otpSent: boolean;
  otp: string;
  countdown: number;  // 30s 倒计时
  error: string | null;
}
```

```
[Smartphone 图标前缀输入框] placeholder: +49 xxx xxx xxxx
[发送验证码按钮]（phoneNumber.length >= 8 才激活）

点击发送：
  1. 设置 otpSent = true
  2. 启动 30s 倒计时
  3. 显示 OTP 输入框（6位，等宽字体）

[OTP 输入框]（出现后）
[验证按钮]
  验证 OTP = CONFIG.OTP_DEMO_CODE ('123456')
  ✅ 正确 → 显示 LoadingOverlay（"检查备份中"，1.5s）→ setStep('RESTORE_PASSWORD')
  ❌ 错误 → 显示错误提示

[30s 倒计时重发]
  倒计时中：灰色文字 "重发 (27s)"
  结束后：蓝色可点击 t('onboard.resend_code')
```

### Step 6: RESTORE_PASSWORD

```
[Cloud 图标 + 弹跳动画（bounce）]
[标题] t('onboard.backup_found')
[密码输入框]（KeyRound 图标前缀，type=password）
[恢复备份按钮]（需有密码才激活）
  点击 → setStep('RESTORE_PROGRESS')
[跳过恢复按钮]（文字按钮）
  点击 → walletStore.clearWallet() → setStep('SUCCESS')
```

Cloud 弹跳动画：
```typescript
Animated.loop(
  Animated.sequence([
    Animated.timing(bounceAnim, { toValue: -10, duration: 600 }),
    Animated.timing(bounceAnim, { toValue: 0, duration: 600 }),
  ])
).start();
```

### Step 7: RESTORE_PROGRESS

```typescript
// 进度模拟（伪代码逻辑）
const stages = [
  { message: t('onboard.status_download'), from: 0, to: 40, duration: 1500 },
  { message: t('onboard.status_verify'), from: 40, to: 70, duration: 1500 },
  { message: t('onboard.status_decrypt'), from: 70, to: 90, duration: 1500 },
  { message: t('onboard.status_import'), from: 90, to: 100, duration: 1000 },
];
```

UI：
```
[圆形进度指示器 0→100%]（使用 SVG/Animated + stroke-dashoffset 技术）
[状态文字]（随进度阶段变化）

完成（100%）后：
  walletStore.restoreWallet(MOCK_CREDENTIALS)
  authStore.updateCloudSync(true, new Date().toISOString())
  → setStep('SUCCESS')
```

### Step 8: SUCCESS

```
[绿色 CheckCircle 图标（大，64px）]
[标题] 已恢复：t('onboard.success_restored') | 全新：t('onboard.success_new')
[进入钱包按钮]
  点击 → authStore.completeOnboarding({
    phoneNumber,
    authMethod: selectedMethod,  // 'BIO' or 'PIN'
  })
  → 导航系统自动跳转主页（isOnboarded 变为 true）
```

---

## 动画过渡

步骤切换使用淡入效果：
```typescript
const fadeAnim = useRef(new Animated.Value(0)).current;
const transitionToStep = (nextStep: OnboardingStep) => {
  Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
    setStep(nextStep);
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  });
};
```

---

## 验证标准

- [ ] WELCOME → AUTH_SELECT → PIN_SETUP 流程可完整走通
- [ ] PIN 两次不一致时显示错误、清空并允许重试
- [ ] OTP `123456` 验证成功
- [ ] RESTORE_PROGRESS 4个阶段依次显示，进度条平滑
- [ ] 完成后 `authStore.isOnboarded === true`，页面自动跳转
- [ ] 跳过恢复路径正常（不显示 RESTORE 步骤，直接 SUCCESS）
