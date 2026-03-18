# T13 — PinPad 数字键盘组件

> **阶段**: 5 - 基础组件
> **依赖**: T01（expo-haptics）, T10（i18n）
> **产出文件**: `src/components/PinPad.tsx`

---

## 任务描述

实现可复用的 6 位 PIN 数字键盘组件，包含圆点指示器和触觉反馈，供 OnboardingScreen 和 LockScreen 共用。

---

## 组件接口

```typescript
interface PinPadProps {
  value: string;            // 当前已输入的 PIN（0-6位）
  onChange: (pin: string) => void;  // PIN 变更回调
  maxLength?: number;       // 默认 6
  error?: boolean;          // 错误状态（圆点变红 + 抖动）
  onComplete?: (pin: string) => void;  // 输入满 6 位时自动触发
}
```

---

## 实现规格

### 圆点指示器

```
○ ○ ○ ○ ○ ○   （空）
● ● ● ○ ○ ○   （已输入3位）
● ● ● ● ● ●   （已输入6位）
🔴🔴🔴🔴🔴🔴  （错误状态）
```

- 圆点大小：14×14px，间距 12px
- 已填：实心圆（`#003399` 正常 / `#EF4444` 错误）
- 未填：空心圆（边框颜色 `#D1D5DB`）
- 错误时触发抖动动画（`Animated.sequence` 左右位移）

### 数字键盘布局

```
┌───┬───┬───┐
│ 1 │ 2 │ 3 │
├───┼───┼───┤
│ 4 │ 5 │ 6 │
├───┼───┼───┤
│ 7 │ 8 │ 9 │
├───┼───┼───┤
│   │ 0 │ ⌫ │
└───┴───┴───┘
```

- 每个按键：圆形背景，60×60px
- 数字键：浅灰背景 `#F3F4F6`（深色：`#374151`）
- 删除键：图标（`Delete` from lucide），同样样式
- 左下角空白：不可点击占位

### 交互逻辑

```typescript
const handlePress = (digit: string) => {
  if (value.length >= maxLength) return;
  const newPin = value + digit;
  Haptics.selectionAsync();  // 每次按键触觉反馈
  onChange(newPin);
  if (newPin.length === maxLength) {
    onComplete?.(newPin);
  }
};

const handleDelete = () => {
  if (value.length === 0) return;
  Haptics.selectionAsync();
  onChange(value.slice(0, -1));
};
```

### 错误动画

```typescript
const shakeAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  if (error) {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}, [error]);
```

---

## 验证标准

- [ ] 每次按数字键触发 `Haptics.selectionAsync()`
- [ ] 输入满 6 位时自动触发 `onComplete`
- [ ] `error=true` 时圆点变红并触发抖动动画
- [ ] 删除键可正常删除最后一位
- [ ] 超过 6 位时不再响应数字按键
- [ ] 深色主题下键盘背景正确切换
