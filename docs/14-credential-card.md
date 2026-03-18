# T14 — CredentialCard 凭证卡片组件

> **阶段**: 5 - 基础组件
> **依赖**: T02（类型）, T03（GRADIENT_MAP）, T01（expo-linear-gradient）
> **产出文件**: `src/components/CredentialCard.tsx`

---

## 任务描述

实现银行卡比例（1.586:1）的凭证卡片，支持渐变背景、撤销状态覆盖层和不同显示尺寸。

---

## 组件接口

```typescript
interface CredentialCardProps {
  credential: VerifiableCredential;
  onPress?: () => void;
  showStatus?: boolean;      // 是否显示状态标签（Active/Expired/Revoked）
  compact?: boolean;         // 紧凑模式（用于扫描确认 Modal）
}
```

---

## 视觉规格

### 比例与尺寸

```
宽高比 = 1.586:1（ISO/IEC 7810 ID-1 标准）
宽度 = 父容器 100%（width: '100%'）
高度 = width / 1.586（用 onLayout 计算）
```

### 视觉层次（从后到前）

```
┌────────────────────────────────────────┐
│ 渐变背景 (LinearGradient)               │  层 1
│  ┌──────────────────────────────────┐  │
│  │ EU DIGITAL WALLET （顶左，透明字）│  │  层 2 - 文字
│  │                        🌐 （顶右）│  │
│  │                                  │  │
│  │                                  │  │
│  │ 凭证标题（底左，大字，白色）       │  │
│  │ 凭证 ID（底左，小字，等宽，截断）  │  │
│  └──────────────────────────────────┘  │
│                                        │
│ [可选] REVOKED 覆盖层（黑色半透明）      │  层 3
└────────────────────────────────────────┘
```

### 详细样式

```typescript
// 渐变背景
const [startColor, endColor] = getGradientColors(credential.visual.color);
<LinearGradient colors={[startColor, endColor]} start={{x: 0, y: 0}} end={{x: 1, y: 1}} />

// 顶左：品牌文字
<Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>
  EU DIGITAL WALLET
</Text>

// 顶右：Globe 图标
<Globe size={20} color="rgba(255,255,255,0.5)" strokeWidth={1.5} />

// 底左：标题
<Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>
  {credential.visual.title}
</Text>

// 底左：ID（截断）
<Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}
      numberOfLines={1}>
  {credential.id.replace('urn:uuid:', '').substring(0, 16)}...
</Text>
```

### 状态标签（showStatus = true 时，卡片左上角）

```typescript
// Active：绿色背景，白字
// Expired：橙色背景，白字
// Revoked：红色背景，白字
const statusInfo = getCredentialStatus(credential);
<View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
  <Text style={styles.statusText}>{statusInfo.label}</Text>
</View>
```

### Revoked 覆盖层

```typescript
{credential.status === 'revoked' && (
  <View style={styles.revokedOverlay}>
    {/* 黑色半透明背景 */}
    <View style={styles.revokedBackground} />
    {/* 旋转 REVOKED 文字 */}
    <Text style={[styles.revokedStamp, { transform: [{ rotate: '-30deg' }] }]}>
      REVOKED
    </Text>
  </View>
)}
```

### 过期/撤销视觉降级

```typescript
// 已撤销：grayscale filter（RN 中用 opacity + 灰色覆盖模拟）
// opacity: 0.75（撤销），0.8（过期）
// 注意：RN 原生不支持 CSS grayscale filter，需用 ImageBackground + 半透明灰色遮罩模拟
const opacity = isRevoked ? 0.75 : isExpired ? 0.8 : 1;
```

---

## 验证标准

- [ ] 卡片宽高比约等于 1.586:1（允许 ±0.05 误差）
- [ ] 渐变色正确映射（`from-blue-800 to-blue-600` → 深蓝渐变）
- [ ] 撤销状态显示红色 "REVOKED" stamp，卡片半透明
- [ ] `showStatus=true` 时左上角显示状态 badge
- [ ] `onPress` 回调正常触发
