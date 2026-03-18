# T27 — RenewalScreen（凭证续期）

> **阶段**: 6 - 屏幕实现
> **依赖**: T05（walletStore）, T03（CONFIG.RENEWAL_YEARS）, T10（i18n）, T12（导航）
> **产出文件**: `src/screens/credential/RenewalScreen.tsx`

---

## 任务描述

实现凭证续期屏幕，三态状态机：空闲 → 处理中 → 成功。

---

## 路由参数

```typescript
type Props = RootStackScreenProps<'Renewal'>;
// route.params.credentialId: string
```

---

## 状态机

```typescript
type RenewalState = 'idle' | 'processing' | 'success';
```

---

## idle 视图

```
[Header 返回按钮 + 标题 t('notifications.renew')]

[居中内容]
  [RefreshCw 图标（蓝色圆圈背景，56px）]
  [凭证标题文字]（粗体）
  [当前到期日]（红色，等宽字体）
    "Expires: 2024-12-15"

[底部按钮]
  [立即续期按钮]（CalendarDays 图标，蓝色）
  点击 → setState('processing')
```

---

## processing 视图

```
[旋转 spinner（蓝色边框圆圈）]
[状态文字] t('notifications.renew_desc')

自动 2.5s 后：
  walletStore.updateCredential(id, {
    expirationDate: addYears(new Date(), CONFIG.RENEWAL_YEARS).toISOString(),
    status: 'active',
  })
  setState('success')
```

---

## success 视图

```
[绿色 CheckCircle 图标（64px）]
[成功标题] "Credential Renewed"
[新到期年份] "New expiry: 2031"（从当前年份 + 5）
[返回钱包按钮] → navigation.navigate('Wallet')
```

---

## 验证标准

- [ ] idle 视图显示凭证名和当前到期日（红色）
- [ ] 点击续期 → processing 动画 → 2.5s 后变 success
- [ ] success 显示新到期年份（当前年 + 5）
- [ ] 返回后：walletStore 中该凭证 `expirationDate` 已更新
- [ ] 更新后凭证状态从 Expired 变为 Active
