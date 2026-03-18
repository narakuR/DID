# T28 — RevokeConfirmationScreen（撤销确认）

> **阶段**: 6 - 屏幕实现
> **依赖**: T05（walletStore）, T08（biometricService）, T10（i18n）, T12（导航）
> **产出文件**: `src/screens/credential/RevokeConfirmationScreen.tsx`

---

## 任务描述

实现凭证撤销确认屏幕，三步状态机：确认 → 生物识别验证 → 成功。

---

## 路由参数

```typescript
type Props = RootStackScreenProps<'RevokeConfirmation'>;
// route.params.credentialId: string
```

---

## 状态机

```typescript
type RevokeStep = 'confirm' | 'auth' | 'success';
```

---

## confirm 视图

```
[居中内容]
  [AlertTriangle 图标（红色圆圈背景，64px）]
  [t('detail.are_you_sure')]（大标题，粗体）
  [t('detail.revocation_intro')]（说明文字）
  [t('detail.revocation_warning')]（红色警告文字）

[底部按钮]
  [确认撤销按钮（红色背景）]（Trash2 图标）
    点击 → setState('auth')
  [取消按钮（灰色文字）]
    点击 → navigation.goBack()
```

---

## auth 视图（自动触发，2s 模拟）

```typescript
useEffect(() => {
  if (step === 'auth') {
    // 方案A：使用真实生物识别
    biometricService.authenticate(t('detail.revoke')).then(success => {
      if (success) {
        // 执行撤销
        walletStore.revokeCredential(credentialId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setState('success');
      } else {
        // 失败：返回 confirm
        setState('confirm');
      }
    });
  }
}, [step]);
```

UI：
```
[居中]
  [Fingerprint 图标（大，蓝色）]
    pulse 动画：scale 1 → 1.2 → 1，循环
    ping 动画：同心圆扩散
  [说明文字] "Verifying your identity..."
```

---

## success 视图

```
[绿色 CheckCircle 图标（64px）]
[t('common.success_revoke')]（标题）
[t('detail.revocation_success_msg')]（说明）
[返回钱包按钮]
  → navigation.navigate('Wallet')
```

---

## 触觉反馈

```typescript
// 点击确认撤销：Heavy Impact
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

// 撤销成功：Error 通知（红色）
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
```

---

## 验证标准

- [ ] confirm 视图正确显示警告文字
- [ ] 点击确认后进入 auth 动画
- [ ] auth 成功后：walletStore 中该凭证 `status === 'revoked'`
- [ ] 返回钱包后，WalletHome 中该凭证显示红色 REVOKED stamp
- [ ] 点击取消：返回上一页（CredentialDetail），无任何数据变更
