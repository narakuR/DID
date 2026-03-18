# T15 — 共享 UI 组件集合

> **阶段**: 5 - 基础组件
> **依赖**: T02（类型）, T03（颜色）, T10（i18n）
> **产出文件**: `src/components/` 下多个文件

---

## 任务描述

实现所有被多个屏幕复用的基础 UI 组件。

---

## 组件清单

### 1. `SearchBar.tsx`

```typescript
interface SearchBarProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}
```

- 圆角输入框（borderRadius: 12）
- 左侧 `Search` 图标（lucide）
- 右侧 clear 按钮（有文字时显示 `X`）
- 主题适配（背景色、文字色）

---

### 2. `FilterChips.tsx`

```typescript
interface FilterChipsProps<T extends string> {
  options: Array<{ label: string; value: T }>;
  selected: T;
  onSelect: (value: T) => void;
}
```

- 横向 `ScrollView`，隐藏滚动条
- 选中态：EU Blue 背景，白字
- 未选中：白色背景，边框，深色字
- 间距 8px，圆角 20px

---

### 3. `DataSection.tsx` + `DataRow.tsx`

```typescript
// DataSection：带标题的数据块
interface DataSectionProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

// DataRow：单行键值对
interface DataRowProps {
  label: string;
  value: string;
  copiable?: boolean;     // 显示复制按钮
  monospace?: boolean;    // 等宽字体
  highlighted?: boolean;  // 红色高亮（过期日期）
}
```

DataRow 实现：
- 左：label（灰色小字）
- 右：value（深色正常字）
- `copiable=true`：value 旁显示 `Copy` 图标，点击调用 `expo-clipboard`
- `highlighted=true`：value 红色背景 + "EXPIRED" badge

---

### 4. `Modal.tsx`（通用底部弹窗）

```typescript
interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: string[];    // 默认 ['50%', '90%']
}
```

实现方式：使用 RN `Modal` + `Animated.spring` 实现底部滑入效果（不使用第三方 bottom sheet 库）：
- 背景：半透明黑色遮罩
- 内容区：白色圆角卡片（borderTopLeftRadius: 24, borderTopRightRadius: 24）
- 顶部拖拽条（4×40px 灰色圆条）
- 下拉关闭（PanResponder 检测向下滑动）

---

### 5. `LoadingOverlay.tsx`

```typescript
interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}
```

- 全屏半透明背景（`position: absolute`, `zIndex: 999`）
- 中央：白色圆角卡片，旋转 spinner + 文字
- 使用 `Animated.loop(Animated.timing(rotation))` 实现旋转

---

### 6. `ActivityLogItem.tsx`

```typescript
interface ActivityLogItemProps {
  log: ActivityLog;
}
```

- 左：彩色圆圈图标（PRESENTED=蓝色 ArrowUpRight，RECEIVED=绿色 ArrowDownLeft，REVOKED=红色 Trash2）
- 中：机构名（粗体）+ 凭证图标 + 凭证名 + 动作描述
- 右：本地化日期时间

---

### 7. `NotificationItem.tsx`

```typescript
interface NotificationItemProps {
  notification: AppNotification;
  onRenew?: (credentialId: string) => void;
}
```

- 左：彩色图标（warning=橙色 Clock，error=红色 AlertTriangle/Trash2，success=绿色 CheckCircle2，info=蓝色 Info）
- 中：标题 + 描述
- 右：时间（warning 类型还有 "Renew" 操作按钮）

---

### 8. `ServiceItem.tsx`

```typescript
interface ServiceItemProps {
  service: ServiceItem;
  onPress: (service: ServiceItem) => void;
}
```

- 左：彩色图标背景圆
- 中：服务名（粗体）+ 提供商（灰色小字）+ 所需数据（更小灰字）
- 右：`ChevronRight` 图标
- 整行可点击，背景阴影

---

### 9. `AlphaIndex.tsx`

```typescript
interface AlphaIndexProps {
  letters: string[];         // 当前可用字母列表
  onPress: (letter: string) => void;
}
```

- 竖向列表 `#ABCDEFGHIJKLMNOPQRSTUVWXYZ`
- 每个字母：12px，灰色，竖排
- 绝对定位在屏幕右侧
- 不可用字母（无对应凭证）：透明度 0.3

---

## 验证标准

- [ ] 所有组件正确响应 `theme`（light/dark）
- [ ] `DataRow` 的 `copiable=true` 点击后调用 `expo-clipboard.setStringAsync()`
- [ ] `Modal` 底部弹窗可通过下拉手势关闭
- [ ] `FilterChips` 横向滚动，超出部分可滑动查看
