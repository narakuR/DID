# T10 — i18n 初始化 + 英文翻译

> **阶段**: 3 - 国际化
> **依赖**: T01（expo-localization, i18n-js 已安装）, T06（settingsStore）
> **产出文件**: `src/i18n/index.ts`, `src/i18n/translations/en.ts`, `src/hooks/useTranslation.ts`

---

## 任务描述

初始化 i18n 系统，实现英文翻译文件（作为所有其他语言的键名基准），并创建 `useTranslation` Hook。

---

## 1. `src/i18n/index.ts`

```typescript
import { I18n } from 'i18n-js';
import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';
import { Language } from '@/types';

import en from './translations/en';
import zh from './translations/zh';
import es from './translations/es';
import fr from './translations/fr';
import pt from './translations/pt';
import ar from './translations/ar';

const i18n = new I18n({ en, zh, es, fr, pt, ar });

// 使用设备语言作为默认值，fallback 到英文
i18n.locale = Localization.getLocales()[0]?.languageCode ?? 'en';
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export const setAppLanguage = (lang: Language) => {
  i18n.locale = lang;
  const isRTL = lang === 'ar';
  I18nManager.allowRTL(isRTL);
  I18nManager.forceRTL(isRTL);
};

export const t = (key: string, params?: Record<string, string | number>) =>
  i18n.t(key, params);

export default i18n;
```

## 2. `src/hooks/useTranslation.ts`

```typescript
import { useSettingsStore } from '@store/settingsStore';
import { t } from '@i18n/index';

export const useTranslation = () => {
  const language = useSettingsStore((s) => s.language);
  // 依赖 language 以触发重渲染
  return {
    t: (key: string, params?: Record<string, string | number>) => t(key, params),
    language,
  };
};
```

## 3. `src/i18n/translations/en.ts`（完整英文键值）

完整实现以下所有翻译键：

```typescript
export default {
  // 底部导航
  nav: {
    wallet: 'Wallet',
    services: 'Services',
    scan: 'Scan',
    activity: 'Activity',
    profile: 'Profile',
  },

  // 钱包主页
  wallet: {
    title: 'My Wallet',
    welcome: 'Welcome back, {{nickname}}',
    search: 'Search credentials...',
    filter_all: 'ALL',
    empty_search: 'No credentials found',
    credential_count: '{{count}} credentials',
  },

  // 通知
  notifications: {
    title: 'Notifications',
    empty: 'No notifications',
    renew: 'Renew',
    expires_soon: 'Expires in {{days}} days',
    expired: 'Credential expired',
    revoked: 'Credential revoked',
    new_credential: 'New credential added',
    welcome: 'Welcome to EU Wallet',
    renew_desc: 'Renewing your credential...',
  },

  // 凭证详情
  detail: {
    verified: 'Verified Credential',
    revoked_msg: 'This credential has been revoked',
    present: 'Present',
    share: 'Share',
    revoke: 'Revoke',
    ai_explain: 'AI Explanation',
    history: 'Credential History',
    no_history: 'No activity history',
    are_you_sure: 'Are you sure?',
    revocation_intro: 'This action will permanently revoke this credential.',
    revocation_warning: 'This cannot be undone.',
    revocation_success_msg: 'Credential has been successfully revoked.',
  },

  // 扫描
  scan: {
    title: 'Scan QR Code',
    align: 'Align QR code within the frame',
    processing: 'Processing...',
    offer: 'Credential Offer',
    wants_to_add: '{{issuerName}} wants to add a credential',
    accept: 'Accept',
    decline: 'Decline',
  },

  // 活动日志
  activity: {
    title: 'Activity Log',
    disclosures: 'Weekly Disclosures',
    empty: 'No activity yet',
    filter_all: 'ALL',
    presented_to: 'Presented to {{entity}}',
    received_from: 'Received from {{entity}}',
    revoked: 'Revoked',
  },

  // 服务市场
  services: {
    title: 'Service Market',
    subtitle: 'Access government and private services',
    search_placeholder: 'Search services...',
    step_connect: 'Connecting to service...',
    step_auth: 'Authenticating identity...',
    step_share: 'Sharing credentials...',
    step_success: 'Authorization successful',
    step_redirect: 'Redirecting to service...',
  },

  // 个人资料
  profile: {
    title: 'Profile',
    personal: 'Personal Information',
    cloud_sync: 'Cloud Backup',
    dark_mode: 'Dark Mode',
    language: 'Language',
    security: 'Security',
    privacy: 'Privacy',
    help: 'Help & Support',
    logout: 'Sign Out',
    on: 'On',
    off: 'Off',
  },

  // Onboarding
  onboard: {
    welcome_title: 'Your Digital Identity',
    welcome_desc: 'Securely store and manage your EU digital identity credentials',
    start: 'Get Started',
    step_auth: 'Choose Authentication Method',
    use_bio: 'Use Biometrics',
    use_pin: 'Use PIN Code',
    pin_setup: 'Set Up PIN',
    pin_confirm: 'Confirm PIN',
    pin_mismatch: 'PINs do not match. Please try again.',
    phone_title: 'Verify Phone Number',
    send_code: 'Send Code',
    resend_code: 'Resend code in {{seconds}}s',
    verify: 'Verify',
    backup_found: 'Backup Found',
    backup_restore: 'Restore Backup',
    backup_skip: 'Skip and start fresh',
    status_download: 'Downloading backup...',
    status_verify: 'Verifying data...',
    status_decrypt: 'Decrypting...',
    status_import: 'Importing credentials...',
    success_restored: 'Wallet Restored!',
    success_new: 'All Set!',
    enter_wallet: 'Enter Wallet',
  },

  // 锁屏
  lock: {
    title: 'Wallet Locked',
    session_expired: 'Your session has expired',
    use_biometric: 'Tap to unlock with biometrics',
    pin_error: 'Incorrect PIN. Please try again.',
  },

  // 凭证发行
  issue: {
    title: 'Add Credential',
    connecting: 'Connecting to issuer...',
    authenticating: 'Authenticating...',
    issuing: 'Issuing credential...',
    success: 'Credential added successfully!',
  },

  // 云同步
  cloud: {
    title: 'Cloud Backup',
    intro_desc: 'Securely backup your credentials to the cloud',
    next: 'Next',
    verify_identity: 'Verify your identity to enable backup',
    set_password: 'Set Backup Password',
    password_placeholder: 'Enter password (min 4 chars)',
    confirm_password: 'Confirm password',
    syncing: 'Backing up...',
    success: 'Backup enabled successfully',
    done: 'Done',
    last_sync: 'Last sync: {{time}}',
    sync_now: 'Sync Now',
    disable: 'Disable Backup',
    disable_confirm: 'Are you sure you want to disable cloud backup?',
  },

  // 通用
  common: {
    cancel: 'Cancel',
    confirm: 'Confirm',
    done: 'Done',
    save: 'Save',
    back: 'Back',
    close: 'Close',
    success_revoke: 'Revocation Complete',
    loading: 'Loading...',
    error: 'An error occurred',
  },
};
```

---

## 验证标准

- [ ] `t('nav.wallet')` 返回 `'Wallet'`
- [ ] `t('wallet.welcome', { nickname: 'Alex' })` 返回 `'Welcome back, Alex'`
- [ ] `useTranslation` Hook 在语言切换后触发组件重渲染
- [ ] `i18n.enableFallback = true`，缺失键 fallback 到英文（不显示 key 本身）
