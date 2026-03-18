# T20 — NotificationsScreen（通知列表）

> **阶段**: 6 - 屏幕实现
> **依赖**: T05（walletStore）, T03（工具函数）, T15（NotificationItem）, T12（导航）
> **产出文件**: `src/screens/wallet/NotificationsScreen.tsx`

---

## 任务描述

实现从凭证状态动态生成通知列表的屏幕，支持续期快捷操作。

---

## 通知生成逻辑

```typescript
const generateNotifications = (credentials: VerifiableCredential[]): AppNotification[] => {
  const notifications: AppNotification[] = [];
  const now = new Date();

  // 系统欢迎消息（始终显示）
  notifications.push({
    id: 'system-welcome',
    type: 'info',
    message: t('notifications.welcome'),
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  credentials.forEach(credential => {
    const status = getCredentialStatus(credential);

    // 已撤销
    if (status.isRevoked) {
      notifications.push({
        id: `revoked-${credential.id}`,
        type: 'error',
        credentialId: credential.id,
        credentialName: credential.visual.title,
        message: t('notifications.revoked'),
        timestamp: credential.issuanceDate,
      });
    }
    // 已过期
    else if (status.isExpired) {
      notifications.push({
        id: `expired-${credential.id}`,
        type: 'error',
        credentialId: credential.id,
        credentialName: credential.visual.title,
        message: t('notifications.expired'),
        timestamp: credential.expirationDate!,
      });
    }
    // 即将到期（<= 30天）
    else if (status.daysUntilExpiry !== undefined && status.daysUntilExpiry <= CONFIG.EXPIRY_WARNING_DAYS) {
      notifications.push({
        id: `warning-${credential.id}`,
        type: 'warning',
        credentialId: credential.id,
        credentialName: credential.visual.title,
        message: t('notifications.expires_soon', { days: status.daysUntilExpiry }),
        timestamp: credential.expirationDate!,
      });
    }
    // 近 7 天新增
    else {
      const receivedAt = new Date(credential.issuanceDate);
      const daysSinceReceived = (now.getTime() - receivedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceReceived <= CONFIG.RECENT_RECEIVED_DAYS) {
        notifications.push({
          id: `new-${credential.id}`,
          type: 'success',
          credentialId: credential.id,
          credentialName: credential.visual.title,
          message: t('notifications.new_credential'),
          timestamp: credential.issuanceDate,
        });
      }
    }
  });

  // 排序：error > warning > success > info
  const priority = { error: 0, warning: 1, success: 2, info: 3 };
  return notifications.sort((a, b) => priority[a.type] - priority[b.type]);
};
```

---

## 屏幕布局

```
[Header]
  ← 返回按钮   [t('notifications.title')]

[FlatList] notifications
  每项：NotificationItem（来自 T15）
    warning 类型：显示 "Renew" 按钮
      点击 → navigation.push('Renewal', { credentialId })

[空状态]
  Bell 图标（灰色）
  t('notifications.empty')
```

---

## 验证标准

- [ ] PilotLicense（约30天到期）显示 warning 通知，有 Renew 按钮
- [ ] PublicTransportPass（约5天到期）显示 warning 通知
- [ ] SecurityClearance（已过期）显示 error 通知
- [ ] LibraryCard（已撤销）显示 error 通知，图标为 Trash2
- [ ] 排序：error 类在最前
- [ ] 点击 Renew 跳转到对应凭证的 RenewalScreen
