# T21 — CredentialDetailScreen（凭证详情）

> **阶段**: 6 - 屏幕实现
> **依赖**: T05（walletStore）, T09（geminiService）, T14（CredentialCard）, T15（DataSection/DataRow/Modal）, T08（biometricService）, T12（导航）
> **产出文件**: `src/screens/credential/CredentialDetailScreen.tsx`

---

## 任务描述

实现凭证详情页，包含 ISO/IEC 23220 数据视图、AI 解释、历史记录和三个操作按钮（出示/分享/撤销）。

---

## 路由参数

```typescript
type Props = RootStackScreenProps<'CredentialDetail'>;
// route.params.credentialId: string
```

---

## 布局结构

```
Header (自定义，无系统导航栏)
  ← ChevronLeft   [凭证标题，截断]   ℹ Info（预留）

ScrollView
  [CredentialCard 完整版，宽高比 1.586:1]

  [验证状态区块]
    ✅ 未撤销：绿色背景，ShieldCheck，t('detail.verified')
    ❌ 已撤销：红色背景，AlertCircle，t('detail.revoked_msg')

  [ISO/IEC 23220 数据视图]（4个 DataSection）

  [AI 解释区块]

  [凭证历史]

底部操作栏（固定，SafeArea 内）
  [Present 按钮]  [Share 按钮]  [Revoke 按钮]
```

---

## ISO/IEC 23220 数据视图实现

### Section 1: Metadata（FileText 图标）

```typescript
<DataSection title="Metadata" icon={FileText}>
  <DataRow label="Type" value={credential.type[credential.type.length - 1]
    .replace(/([A-Z])/g, ' $1').trim()} />  // 驼峰转空格
  <DataRow label="Credential ID" value={credential.id} copiable monospace />
  <DataRow label="Issued" value={formatDate(credential.issuanceDate)} />
  {credential.expirationDate && (
    <DataRow
      label="Expires"
      value={formatDate(credential.expirationDate)}
      highlighted={getCredentialStatus(credential).isExpired}
    />
  )}
</DataSection>
```

### Section 2: Issuer（UserCheck 图标）

```typescript
<DataSection title="Issuer" icon={UserCheck}>
  <DataRow label="Name" value={credential.issuer.name} />
  <DataRow label="DID" value={credential.issuer.id} copiable monospace />
</DataSection>
```

### Section 3: Subject（Fingerprint 图标）

```typescript
<DataSection title="Subject" icon={Fingerprint}>
  <DataRow label="DID" value={credential.credentialSubject.id} copiable monospace />
</DataSection>
```

### Section 4: Claims（List 图标）

```typescript
// 遍历 credentialSubject 所有字段（跳过 'id'）
Object.entries(credential.credentialSubject)
  .filter(([key]) => key !== 'id')
  .map(([key, value]) => {
    if (Array.isArray(value)) {
      // 数组：每项一行，缩进
      return value.map((item, i) => (
        <DataRow key={`${key}-${i}`} label={i === 0 ? key : ''} value={String(item)} />
      ));
    } else if (typeof value === 'object' && value !== null) {
      // 嵌套对象：键值对展示
      return Object.entries(value).map(([subKey, subVal]) => (
        <DataRow key={subKey} label={subKey} value={String(subVal)} />
      ));
    } else {
      return <DataRow key={key} label={key} value={String(value)} />;
    }
  })
```

---

## AI 解释区块

```typescript
const [aiText, setAiText] = useState<string | null>(null);
const [aiLoading, setAiLoading] = useState(false);

const handleAiExplain = async () => {
  setAiLoading(true);
  const text = await geminiService.explainCredential(credential);
  setAiText(text);
  setAiLoading(false);
};
```

UI：
```
[渐变蓝色背景卡片]（from-blue-900 to-indigo-900）
  BrainCircuit 图标 | t('detail.ai_explain')

  初始状态：
    [链接按钮] t('detail.ai_explain') → 点击触发 handleAiExplain

  加载中：
    [旋转 spinner]

  完成后：
    [AI 文本，fade-in 动画]
```

---

## 底部操作栏（三个按钮）

### Present 出示按钮

```typescript
// 状态：active 才可用（非 revoked、非 expired）
const canPresent = !isRevoked && !isExpired;

const handlePresent = async () => {
  if (!canPresent) return;
  // 步骤1：生物识别验证 Overlay（1.5s 模拟）
  setShowBioOverlay(true);
  await delay(1500);
  setShowBioOverlay(false);
  // 步骤2：显示 QR 码 Overlay
  setShowQrOverlay(true);
};
```

**QR Overlay**：
```
[黑色全屏背景]
  [白色卡片，居中]
    [模拟 QR 图案（简单网格 SVG 或 View 组合）]
    [NFC 图标 + "or tap to share via NFC" 文字]
  [X 关闭按钮（右上角）]
```

### Share 分享按钮

```typescript
const handleShare = () => {
  setShowShareModal(true);
};
```

**Share Modal**（底部弹窗，5分钟倒计时）：
```
[倒计时文字] "Share expires in 4:59"
[复制链接按钮] → expo-clipboard.setStringAsync(credential.id)
[发送邮件按钮] → expo-sharing.shareAsync(...)
```

### Revoke 撤销按钮

```typescript
const handleRevoke = () => {
  navigation.push('RevokeConfirmation', { credentialId: credential.id });
};
```

---

## 验证标准

- [ ] Present 按钮在已撤销/已过期凭证上为灰色不可点
- [ ] 点击 Present：先显示生物识别动画 → 再显示 QR Overlay
- [ ] Claims 部分：数组和嵌套对象正确渲染
- [ ] AI 解释按钮点击后显示 spinner，完成后 fade-in 显示文字
- [ ] 点击 Revoke → 跳转 RevokeConfirmationScreen
- [ ] 凭证历史列表正确过滤（按 credentialId 过滤 MOCK_ACTIVITY_LOGS）
