# T03 — 常量、颜色系统与 Mock 数据

> **阶段**: 0 - 项目基础
> **依赖**: T02（类型定义）
> **产出文件**: `src/constants/colors.ts`, `src/constants/config.ts`, `src/constants/mockData.ts`

---

## 任务描述

实现颜色常量、凭证渐变色映射表、全局配置以及完整的 20 条 Mock 凭证数据和 6 条活动日志。

---

## 实现内容

### 1. `src/constants/colors.ts`

```typescript
export const COLORS = {
  euBlue: '#003399',
  euYellow: '#FFCE00',

  light: {
    background: '#F9FAFB',
    surface: '#FFFFFF',
    border: '#E5E7EB',
    text: '#111827',
    textSecondary: '#6B7280',
    tabBar: '#FFFFFF',
  },

  dark: {
    background: '#111827',
    surface: '#1F2937',
    border: '#374151',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    tabBar: '#111827',
  },

  success: '#22C55E',
  warning: '#F97316',
  error: '#EF4444',
  info: '#3B82F6',
};

// Tailwind 渐变类 → RN LinearGradient 颜色对映射
export const GRADIENT_MAP: Record<string, [string, string]> = {
  'from-blue-800 to-blue-600':           ['#1e40af', '#2563eb'],
  'from-emerald-700 to-teal-600':        ['#065f46', '#0d9488'],
  'from-slate-700 to-slate-600':         ['#334155', '#475569'],
  'from-purple-800 to-indigo-700':       ['#6b21a8', '#4338ca'],
  'from-indigo-900 to-blue-900':         ['#312e81', '#1e3a8a'],
  'from-rose-600 to-pink-600':           ['#e11d48', '#db2777'],
  'from-cyan-600 to-blue-500':           ['#0891b2', '#3b82f6'],
  'from-red-500 to-red-400':             ['#ef4444', '#f87171'],
  'from-sky-600 to-sky-400':             ['#0284c7', '#38bdf8'],
  'from-red-700 to-red-600':             ['#b91c1c', '#dc2626'],
  'from-red-600 to-orange-600':          ['#dc2626', '#ea580c'],
  'from-emerald-800 to-green-700':       ['#065f46', '#15803d'],
  'from-gray-800 to-black':              ['#1f2937', '#000000'],
  'from-slate-800 to-slate-700':         ['#1e293b', '#334155'],
  'from-amber-600 to-orange-500':        ['#d97706', '#f97316'],
  'from-fuchsia-700 to-purple-600':      ['#a21caf', '#9333ea'],
  'from-lime-600 to-green-600':          ['#65a30d', '#16a34a'],
  'from-gray-600 to-gray-500':           ['#4b5563', '#6b7280'],
  'from-amber-700 to-yellow-600':        ['#b45309', '#ca8a04'],
  'from-indigo-700 to-blue-700':         ['#4338ca', '#1d4ed8'],
};

// 辅助函数：从 visual.color 字符串提取渐变颜色
export const getGradientColors = (colorStr: string): [string, string] => {
  // visual.color 格式: "bg-gradient-to-br from-blue-800 to-blue-600"
  const key = colorStr.replace('bg-gradient-to-br ', '');
  return GRADIENT_MAP[key] || ['#1e40af', '#2563eb'];
};
```

### 2. `src/constants/config.ts`

```typescript
export const CONFIG = {
  INACTIVITY_LIMIT_MS: 300000,    // 5 分钟自动锁定
  OTP_DEMO_CODE: '123456',         // Demo 固定验证码
  RESTORE_SIMULATION_MS: 1500,     // 恢复模拟延迟
  QR_PRESENT_TIMEOUT_MS: 300000,   // 分享 QR 5分钟倒计时
  RENEWAL_YEARS: 5,                // 续期年限
  EXPIRY_WARNING_DAYS: 30,         // 到期警告阈值（天）
  RECENT_RECEIVED_DAYS: 7,         // 新增凭证通知阈值（天）
};

export const STORAGE_KEYS = {
  IS_ONBOARDED: 'eu_wallet_onboarded',
  USER_PROFILE: 'eu_wallet_user',
  CLOUD_SYNC: 'eu_wallet_cloud_sync',
  CREDENTIALS: 'eu_wallet_credentials',
  THEME: 'eu_wallet_theme',
  LANGUAGE: 'eu_wallet_language',
} as const;

export const SECURE_STORE_KEYS = {
  PIN: 'wallet_pin',
  CLOUD_BACKUP_KEY: 'cloud_backup_key',
} as const;
```

### 3. `src/constants/mockData.ts`（20条凭证 + 6条日志 + 图表数据）

实现完整的 `MOCK_CREDENTIALS: VerifiableCredential[]` 数组，覆盖以下 20 条：

| # | type | issuer.name | issuer.type | status | expirationDate 特殊说明 |
|---|------|------------|------------|--------|----------------------|
| 1 | PermanentResidentCard | EU Identity Service | GOVERNMENT | active | 正常（2030年） |
| 2 | Iso18013DriversLicense-B | Federal Motor Transport | GOVERNMENT | active | 正常 |
| 3 | Iso18013DriversLicense-A | Federal Motor Transport | GOVERNMENT | active | 正常 |
| 4 | UniversityDegree-BSc | Sorbonne University | UNIVERSITY | active | 正常 |
| 5 | UniversityDegree-MBA | TU Munich | UNIVERSITY | active | 正常 |
| 6 | HealthInsurance | Allianz Care | HEALTH | active | 约365天后到期 |
| 7 | VaccinationCertificate | Ministry of Health | HEALTH | active | 正常 |
| 8 | OrganDonor | National Transplant Org | HEALTH | active | 正常 |
| 9 | PilotLicense | EASA | TRANSPORT | active | **约30天后**（触发 warning） |
| 10 | PublicTransportPass | Deutsche Bahn | TRANSPORT | active | **约5天后**（触发 warning） |
| 11 | BankAccount | Sparkasse Berlin | BANK | active | 正常 |
| 12 | CreditScore | SCHUFA | BANK | active | 正常 |
| 13 | EmployeeCredential | EuroTech Solutions | CORPORATE | active | 正常 |
| 14 | SecurityClearance | Federal Security Office | GOVERNMENT | active | 2024年（已过期） |
| 15 | LibraryCard | Berlin State Library | ENTERTAINMENT | **revoked** | - |
| 16 | MuseumPass | National Museums | ENTERTAINMENT | active | 正常 |
| 17 | GymMembership | FitLife Europe | ENTERTAINMENT | active | 正常 |
| 18 | TaxIdentification | Federal Tax Office | GOVERNMENT | active | 正常 |
| 19 | ResidentPermit | City of Munich | GOVERNMENT | active | 正常 |
| 20 | ProfessionalCertification | Chamber of Engineers | CORPORATE | active | 正常 |

每条凭证均需包含合理的 `credentialSubject` 字段（姓名、ID、地址等）。

```typescript
export const MOCK_ACTIVITY_LOGS: ActivityLog[] = [
  // 6条，按时间倒序：30分钟前、2天前、5天前、10天前、15天前、20天前
];

export const MOCK_GRAPH_DATA: ActivityGraphPoint[] = [
  { name: 'Mon', disclosures: 2 },
  { name: 'Tue', disclosures: 5 },
  { name: 'Wed', disclosures: 1 },
  { name: 'Thu', disclosures: 3 },
  { name: 'Fri', disclosures: 4 },
  { name: 'Sat', disclosures: 8 },  // 最高，蓝色
  { name: 'Sun', disclosures: 2 },
];
```

---

## 辅助工具函数（放 `src/utils/credentialUtils.ts`）

```typescript
import { VerifiableCredential, CredentialStatusInfo } from '@/types';
import { CONFIG } from '@constants/config';

export const getCredentialStatus = (credential: VerifiableCredential): CredentialStatusInfo => {
  if (credential.status === 'revoked') {
    return { label: 'Revoked', color: '#EF4444', isExpired: false, isRevoked: true };
  }

  if (credential.expirationDate) {
    const expiry = new Date(credential.expirationDate);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { label: 'Expired', color: '#F97316', isExpired: true, isRevoked: false, daysUntilExpiry };
    }
    return { label: 'Active', color: '#22C55E', isExpired: false, isRevoked: false, daysUntilExpiry };
  }

  return { label: 'Active', color: '#22C55E', isExpired: false, isRevoked: false };
};
```

---

## 验证标准

- [ ] `MOCK_CREDENTIALS.length === 20`
- [ ] 凭证 #9 (PilotLicense) 的 `daysUntilExpiry` 在 25-35 天范围内
- [ ] 凭证 #10 (PublicTransportPass) 的 `daysUntilExpiry` 在 3-7 天范围内
- [ ] 凭证 #14 (SecurityClearance) `getCredentialStatus` 返回 `isExpired: true`
- [ ] 凭证 #15 (LibraryCard) `getCredentialStatus` 返回 `isRevoked: true`
- [ ] `GRADIENT_MAP` 包含所有 20 种渐变色键值
