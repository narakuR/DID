# T02 — TypeScript 类型定义

> **阶段**: 0 - 项目基础
> **依赖**: T01
> **产出文件**: `src/types/index.ts`

---

## 任务描述

定义项目全局 TypeScript 类型，包括 W3C Verifiable Credentials 数据模型、活动日志、用户档案、导航参数等。

---

## 实现内容

### 文件：`src/types/index.ts`

完整实现以下类型：

#### 1. IssuerType 枚举

```typescript
export enum IssuerType {
  GOVERNMENT = 'GOVERNMENT',
  UNIVERSITY = 'UNIVERSITY',
  HEALTH = 'HEALTH',
  BANK = 'BANK',
  TRANSPORT = 'TRANSPORT',
  CORPORATE = 'CORPORATE',
  ENTERTAINMENT = 'ENTERTAINMENT',
  UTILITY = 'UTILITY',
}
```

#### 2. VerifiableCredential（W3C 标准 + 视觉扩展）

```typescript
export interface CredentialSubject {
  id: string;
  [key: string]: any;
}

export interface VerifiableCredential {
  '@context': string[];
  id: string;           // urn:uuid:xxx
  type: string[];       // ['VerifiableCredential', '具体类型']
  issuer: {
    id: string;         // did:ebsi:xxx
    name: string;
    type: IssuerType;
  };
  issuanceDate: string;       // ISO 8601
  expirationDate?: string;
  status?: 'active' | 'revoked';
  credentialSubject: CredentialSubject;
  proof?: {
    type: string;
    created: string;
    proofPurpose: string;
    verificationMethod: string;
    jws: string;
  };
  visual: {
    color: string;    // Tailwind 渐变类字符串（用于 GRADIENT_MAP 映射）
    icon: string;     // lucide-react-native 图标名
    title: string;
    description: string;
  };
}
```

#### 3. ActivityLog

```typescript
export type ActivityAction = 'PRESENTED' | 'RECEIVED' | 'REVOKED';

export interface ActivityLog {
  id: string;
  action: ActivityAction;
  credentialId: string;
  credentialName: string;
  credentialIcon: string;
  entity: string;
  timestamp: string;    // ISO 8601
  status?: 'success' | 'revoked';
}

export interface ActivityGraphPoint {
  name: string;          // 'Mon' ~ 'Sun'
  disclosures: number;
}
```

#### 4. UserProfile & 认证相关

```typescript
export type AuthMethod = 'BIO' | 'PIN';
export type Language = 'en' | 'zh' | 'es' | 'fr' | 'pt' | 'ar';
export type Theme = 'light' | 'dark';

export interface UserProfile {
  phoneNumber: string;
  authMethod: AuthMethod;
  nickname?: string;
  // PIN 不存此处，存 SecureStore
}

export interface CloudSyncState {
  enabled: boolean;
  lastSync: string | null;
}
```

#### 5. CredentialStatusInfo（计算属性，非存储）

```typescript
export type CredentialStatusInfo = {
  label: 'Active' | 'Expired' | 'Revoked';
  color: string;
  isExpired: boolean;
  isRevoked: boolean;
  daysUntilExpiry?: number;
};
```

#### 6. 服务市场类型

```typescript
export type ServiceCategory = 'ALL' | 'GOV' | 'EDU' | 'HEALTH' | 'TRANSPORT' | 'FINANCE' | 'EMPLOYMENT';

export interface ServiceItem {
  id: string;
  icon: string;           // lucide 图标名
  category: ServiceCategory;
  name: string;
  provider: string;
  requiredData: string;   // 所需凭证描述
}
```

#### 7. 通知类型

```typescript
export type NotificationType = 'warning' | 'error' | 'success' | 'info';

export interface AppNotification {
  id: string;
  type: NotificationType;
  credentialId?: string;
  credentialName?: string;
  message: string;
  timestamp: string;
}
```

---

## 验证标准

- [ ] 所有类型无 TypeScript 编译错误
- [ ] `VerifiableCredential` 中 `visual.color` 有完整 JSDoc 注释说明其与 `GRADIENT_MAP` 的对应关系
- [ ] 文件从 `@/types` 路径可正常导入
