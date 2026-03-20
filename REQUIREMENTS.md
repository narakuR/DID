# EU Digital Identity Wallet — 移动端需求文档

> **版本**: 1.1
> **日期**: 2026-03-19
> **技术栈**: React Native + Expo + Expo Development Build（不使用 EAS 服务）
> **变更说明**: v1.1 新增「DID 密钥对管理」与「双端推送通知」两项核心功能规格

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈与环境要求](#2-技术栈与环境要求)
3. [项目结构](#3-项目结构)
4. [数据模型](#4-数据模型)
5. [导航结构](#5-导航结构)
6. [屏幕与功能详细规格](#6-屏幕与功能详细规格)
7. [全局状态管理](#7-全局状态管理)
8. [原生能力集成](#8-原生能力集成)
9. [国际化（i18n）](#9-国际化i18n)
10. [主题与样式](#10-主题与样式)
11. [AI 集成（Gemini）](#11-ai-集成gemini)
12. [安全要求](#12-安全要求)
13. [持久化存储策略](#13-持久化存储策略)
14. [构建与运行配置](#14-构建与运行配置)
15. [Mock 数据规格](#15-mock-数据规格)
16. [DID 密钥对生成与管理](#16-did-密钥对生成与管理)
17. [双端推送通知系统](#17-双端推送通知系统)

---

## 1. 项目概述

### 1.1 产品定位

本应用为 **欧盟数字身份钱包（EU Digital Identity Wallet）**，符合 W3C Verifiable Credentials 标准，支持存储、管理、出示多种类型的可验证凭证（证件）。用户可安全地管理政府颁发的身份证、驾照、学历证书、医疗保险卡、银行账户证明等数字证件。

### 1.2 目标平台


| 平台                    | 支持  |
| --------------------- | --- |
| iOS 15+               | ✅   |
| Android 11+ (API 30+) | ✅   |


### 1.3 核心功能概览

- **安全认证**：生物识别（Face ID / Touch ID / 指纹）或 6 位 PIN 码
- **凭证钱包**：存储、搜索、分类查看多种 VC（Verifiable Credentials）
- **凭证出示**：通过 QR 码或 NFC 出示凭证
- **QR 扫描**：扫描 QR 码接收新凭证（OpenID4VCI 流程）
- **活动日志**：记录凭证出示、接收、撤销历史
- **服务市场**：使用数字身份接入政府/教育/医疗等第三方服务
- **云端备份**：加密备份与恢复钱包数据
- **AI 解释**：使用 Gemini 解读凭证内容
- **多语言**：英/中/西/法/葡/阿（含 RTL）
- **深色模式**：完整 Light/Dark 主题

---

## 2. 技术栈与环境要求

### 2.1 核心框架

```
React Native (via Expo SDK 52+)
Expo Development Build（非 Expo Go，非 EAS 云构建）
TypeScript 5.x
```

### 2.2 必要依赖包

#### 导航

```
@react-navigation/native ^7.x
@react-navigation/bottom-tabs ^7.x
@react-navigation/native-stack ^7.x
react-native-screens
react-native-safe-area-context
```

#### 状态管理 & 持久化

```
zustand ^4.x                      # 全局状态管理（替代 React Context）
@react-native-async-storage/async-storage  # 本地持久化（替代 localStorage）
react-native-mmkv ^3.x            # 高性能 KV 存储（可选，用于敏感以外数据）
```

#### 生物识别 & 安全

```
expo-local-authentication            # FaceID / TouchID / 指纹
expo-secure-store                    # 安全存储 PIN 码、密钥（Keychain/Keystore）
expo-crypto                          # 加密工具（用于云备份加密）
```

#### 相机 & QR 扫描

```
expo-camera ^16.x                   # 相机权限与视图
expo-barcode-scanner (via camera)   # QR 码扫描（集成在 expo-camera 中）
```

#### UI 组件 & 图标

```
lucide-react-native ^0.x            # 图标库（对应 web 版 lucide-react）
react-native-reanimated ^3.x        # 动画（替代 CSS animations）
react-native-gesture-handler ^2.x   # 手势支持
```

#### 图表

```
react-native-gifted-charts ^1.x     # 替代 recharts，支持 RN 的柱状图
或
victory-native ^37.x                # 另一个 RN 图表库
```

#### 其他工具

```
expo-haptics                        # 触觉反馈（PIN 输入、操作确认）
expo-clipboard                      # 复制凭证 ID
expo-sharing                        # 分享凭证
expo-font                           # 自定义字体
expo-status-bar                     # 状态栏控制
@expo/vector-icons                  # 备用图标
```

#### 推送通知

```
expo-notifications ^0.x             # 本地 + 远程推送通知
expo-device                         # 检测物理设备（模拟器不支持推送）
```

#### DID 密钥学

```
react-native-quick-crypto ^0.x      # 原生加速的 Web Crypto 兼容层（支持 Ed25519 / ECDSA）
@noble/ed25519 ^2.x                 # 纯 JS Ed25519 实现（JS fallback）
@noble/secp256k1 ^2.x               # secp256k1 曲线（EBSI 兼容）
did-resolver ^4.x                   # W3C DID 解析器接口
@decentralized-identity/ion-tools   # 可选：ION/Sidetree DID 方法支持
```

#### AI 服务

```
@google/genai ^1.x                  # Gemini API SDK
```

#### 开发工具

```
expo ~52.x
expo-dev-client                     # Development Build 核心依赖
expo-build-properties               # 构建配置
babel-plugin-module-resolver        # 路径别名
```

### 2.3 环境变量

通过 `app.config.ts` 的 `extra` 字段注入（非 EAS，使用 `.env` 本地文件）：

```typescript
// .env
EXPO_PUBLIC_GEMINI_API_KEY=your_key_here

# ★ DID 后端服务
EXPO_PUBLIC_DID_REGISTRY_URL=https://api.your-did-registry.example.com
EXPO_PUBLIC_DID_REGISTRY_API_KEY=your_registry_api_key

# ★ 推送通知后端
EXPO_PUBLIC_PUSH_SERVER_URL=https://push.your-backend.example.com
```

### 2.4 Expo 配置要求（app.config.ts）

```typescript
export default {
  expo: {
    name: "EU Wallet",
    slug: "eu-wallet",
    version: "1.0.0",
    platforms: ["ios", "android"],

    // iOS 权限
    infoPlist: {
      NSCameraUsageDescription: "扫描凭证二维码",
      NSFaceIDUsageDescription: "使用 Face ID 解锁钱包",
    },

    // Android 权限
    android: {
      permissions: [
        "android.permission.CAMERA",
        "android.permission.USE_BIOMETRIC",
        "android.permission.USE_FINGERPRINT",
        // ★ 推送通知所需权限
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE",
        "android.permission.POST_NOTIFICATIONS",
      ],
      googleServicesFile: "./google-services.json",  // ★ FCM 配置
    },

    // iOS 额外配置
    infoPlist: {
      NSCameraUsageDescription: "扫描凭证二维码",
      NSFaceIDUsageDescription: "使用 Face ID 解锁钱包",
    },

    plugins: [
      "expo-camera",
      "expo-local-authentication",
      "expo-secure-store",
      // ★ 推送通知插件
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#003399",
          sounds: ["./assets/notification.wav"],
          androidMode: "default",
          androidCollapsedTitle: "EU Wallet",
        }
      ],
      [
        "expo-build-properties",
        {
          ios: { deploymentTarget: "15.0" },
          android: { compileSdkVersion: 35, targetSdkVersion: 34 }
        }
      ]
    ]
  }
}
```

---

## 3. 项目结构

```
src/
├── app/                          # 入口 & 导航
│   ├── index.tsx                 # App 根组件
│   └── _layout.tsx               # 根布局（Provider 注入）
│
├── navigation/
│   ├── RootNavigator.tsx         # 根导航（含认证状态判断）
│   ├── TabNavigator.tsx          # 底部 Tab 导航
│   └── types.ts                  # 导航参数类型定义
│
├── screens/                      # 所有屏幕
│   ├── onboarding/
│   │   └── OnboardingScreen.tsx
│   ├── lock/
│   │   └── LockScreen.tsx
│   ├── wallet/
│   │   ├── WalletHomeScreen.tsx
│   │   └── NotificationsScreen.tsx
│   ├── credential/
│   │   ├── CredentialDetailScreen.tsx
│   │   ├── IssuanceScreen.tsx
│   │   ├── RenewalScreen.tsx
│   │   └── RevokeConfirmationScreen.tsx
│   ├── scan/
│   │   └── ScanScreen.tsx
│   ├── activity/
│   │   └── ActivityScreen.tsx
│   ├── services/
│   │   └── ServicesScreen.tsx
│   └── profile/
│       └── ProfileScreen.tsx
│
├── components/                   # 可复用组件
│   ├── CredentialCard.tsx
│   ├── PinPad.tsx               # 数字键盘（Onboarding & Lock 共用）
│   ├── BiometricPrompt.tsx
│   ├── DataSection.tsx          # 凭证详情数据区块
│   ├── DataRow.tsx
│   ├── NotificationItem.tsx
│   ├── ServiceItem.tsx
│   ├── ActivityLogItem.tsx
│   ├── FilterChips.tsx
│   ├── SearchBar.tsx
│   ├── AlphaIndex.tsx           # 字母索引侧边栏
│   ├── Modal.tsx                # 通用底部弹窗
│   └── LoadingOverlay.tsx       # 全屏加载遮罩
│
├── store/                        # Zustand stores
│   ├── authStore.ts
│   ├── walletStore.ts
│   ├── settingsStore.ts         # 主题 + 语言
│   ├── didStore.ts              # ★ DID 标识符 + 密钥元数据状态
│   └── notificationStore.ts     # ★ 推送令牌 + 通知列表状态
│
├── services/
│   ├── geminiService.ts         # AI 服务
│   ├── biometricService.ts      # 生物识别封装
│   ├── storageService.ts        # AsyncStorage 封装
│   ├── didService.ts            # ★ DID 生成、密钥对管理、DID 文档上传
│   └── pushNotificationService.ts  # ★ 推送令牌注册、通知调度、后台处理
│
├── hooks/
│   ├── useInactivityTimer.ts    # 5分钟自动锁定
│   ├── useBiometric.ts
│   ├── useTranslation.ts
│   ├── useDID.ts                # ★ DID 状态与操作 Hook
│   └── usePushNotifications.ts  # ★ 推送权限与令牌 Hook
│
├── i18n/
│   ├── index.ts                 # i18n 初始化
│   └── translations/
│       ├── en.ts
│       ├── zh.ts
│       ├── es.ts
│       ├── fr.ts
│       ├── pt.ts
│       └── ar.ts
│
├── constants/
│   ├── mockData.ts              # 20条 Mock 凭证 + 活动日志
│   ├── colors.ts                # 品牌色彩常量
│   └── config.ts                # 全局配置（超时时长等）
│
└── types/
    └── index.ts                  # 全局 TypeScript 类型定义
```

---

## 4. 数据模型

### 4.1 VerifiableCredential（W3C 标准）

```typescript
export enum IssuerType {
  GOVERNMENT = 'GOVERNMENT',
  UNIVERSITY = 'UNIVERSITY',
  HEALTH = 'HEALTH',
  BANK = 'BANK',
  TRANSPORT = 'TRANSPORT',
  CORPORATE = 'CORPORATE',
  ENTERTAINMENT = 'ENTERTAINMENT',
  UTILITY = 'UTILITY'
}

export interface CredentialSubject {
  id: string;
  [key: string]: any;  // 动态字段，支持任意声明
}

export interface VerifiableCredential {
  '@context': string[];
  id: string;           // urn:uuid:xxx 格式
  type: string[];       // ['VerifiableCredential', '具体类型']
  issuer: {
    id: string;         // DID 格式：did:ebsi:xxx
    name: string;
    type: IssuerType;
  };
  issuanceDate: string;       // ISO 8601
  expirationDate?: string;    // ISO 8601（可选）
  status?: 'active' | 'revoked';
  credentialSubject: CredentialSubject;
  proof?: {
    type: string;
    created: string;
    proofPurpose: string;
    verificationMethod: string;
    jws: string;
  };
  visual: {           // 仅 UI 展示使用，非 W3C 标准字段
    color: string;    // Tailwind-like 渐变色字符串（需映射到 RN StyleSheet）
    icon: string;     // lucide-react-native 图标名
    title: string;
    description: string;
  };
}
```

### 4.2 ActivityLog（活动日志）

```typescript
export type ActivityAction = 'PRESENTED' | 'RECEIVED' | 'REVOKED';

export interface ActivityLog {
  id: string;
  action: ActivityAction;
  credentialId: string;
  credentialName: string;
  credentialIcon: string;    // lucide 图标名
  entity: string;            // 对方机构名称
  timestamp: string;         // ISO 8601
  status?: string;           // 'success' | 'revoked'
}

export interface ActivityGraphPoint {
  name: string;              // 星期名称（Mon ~ Sun）
  disclosures: number;       // 当天出示次数
}
```

### 4.3 UserProfile（用户档案）

```typescript
export type AuthMethod = 'BIO' | 'PIN';

export interface UserProfile {
  phoneNumber: string;
  authMethod: AuthMethod;
  pin?: string;           // 存储到 SecureStore，不存普通 Storage
  nickname?: string;
}

export interface CloudSyncState {
  enabled: boolean;
  lastSync: string | null;  // ISO 8601
}
```

### 4.4 CredentialStatus（计算属性，非存储）

```typescript
export type CredentialStatusInfo = {
  label: string;            // 'Active' | 'Expired' | 'Revoked'
  color: string;            // hex 颜色
  isExpired: boolean;
  isRevoked: boolean;
  daysUntilExpiry?: number; // 正数=未过期，负数=已过期
};
```

### 4.5 ★ DIDKeyPair（DID 密钥对，核心安全数据）

```typescript
export type DIDMethod = 'did:key' | 'did:ebsi' | 'did:ion';
export type KeyAlgorithm = 'Ed25519' | 'ES256K' | 'P-256';

/**
 * 本地存储（SecureStore）——仅含私钥原始字节的 Base64 编码
 * 绝不包含公钥或 DID，防止意外关联泄露
 */
export interface DIDPrivateKeyRecord {
  keyId: string;            // 唯一标识，格式：did:key:<thumbprint>#<fragment>
  algorithm: KeyAlgorithm;
  privateKeyBase64: string; // Base64url 编码的私钥原始字节（由 SecureStore 加密保存）
  createdAt: string;        // ISO 8601
}

/**
 * 后端存储（DID Registry） + 本地元数据缓存（AsyncStorage）
 * 不含私钥，仅含公开信息
 */
export interface DIDDocument {
  '@context': ['https://www.w3.org/ns/did/v1', ...string[]];
  id: string;               // DID 标识符，e.g. did:key:z6Mk...
  verificationMethod: Array<{
    id: string;             // {did}#keys-1
    type: 'Ed25519VerificationKey2020' | 'EcdsaSecp256k1VerificationKey2019';
    controller: string;     // 同 id.did
    publicKeyMultibase: string;  // 多基编码的公钥（Base58btc 前缀 z）
  }>;
  authentication: string[];        // 引用 verificationMethod id
  assertionMethod: string[];
  created: string;                 // ISO 8601
  updated: string;
}

/**
 * 本地轻量缓存（AsyncStorage）——公开元数据，不含私钥
 */
export interface DIDMetadata {
  did: string;              // 完整 DID 字符串
  method: DIDMethod;
  algorithm: KeyAlgorithm;
  keyId: string;            // 对应 DIDPrivateKeyRecord.keyId
  publicKeyMultibase: string;
  registeredAt: string;     // ISO 8601，上传到后端的时间
  status: 'active' | 'rotated' | 'deactivated';
}
```

### 4.6 ★ PushNotificationRecord（推送通知记录）

```typescript
export type PushNotificationCategory =
  | 'CREDENTIAL_EXPIRY'   // 凭证即将到期
  | 'CREDENTIAL_REVOKED'  // 凭证被撤销
  | 'CREDENTIAL_ISSUED'   // 新凭证待接收
  | 'VERIFICATION_REQUEST'// 身份验证请求
  | 'SYSTEM'              // 系统公告
  | 'BACKUP_REMINDER';    // 云备份提醒

export interface PushNotificationRecord {
  id: string;
  category: PushNotificationCategory;
  title: string;
  body: string;
  data?: Record<string, any>;    // 深度链接所需的结构化载荷
  receivedAt: string;            // ISO 8601
  isRead: boolean;
  actionTaken?: string;          // e.g. 'renewed', 'dismissed'
}

/**
 * 存储在后端的设备令牌记录（服务端数据结构参考）
 */
export interface DevicePushToken {
  userId: string;          // DID 作为用户标识
  platform: 'ios' | 'android';
  expoPushToken: string;   // Expo 推送令牌格式：ExponentPushToken[...]
  fcmToken?: string;       // Android FCM 原生令牌（备用）
  apnsToken?: string;      // iOS APNs 原生令牌（备用）
  registeredAt: string;
  lastActiveAt: string;
  appVersion: string;
}
```

---

## 5. 导航结构

```
RootNavigator (Stack)
│
├── [if !isOnboarded] → OnboardingScreen (全屏，无导航栏)
│
├── [if isLocked] → LockScreen (全屏，无导航栏，覆盖在所有页面之上)
│
└── [if isOnboarded && !isLocked] → MainNavigator
    │
    ├── TabNavigator (底部 Tab)
    │   ├── Tab: Wallet → WalletHomeScreen
    │   ├── Tab: Services → ServicesScreen
    │   ├── Tab: Scan (中间大按钮) → ScanScreen (present as modal)
    │   ├── Tab: Activity → ActivityScreen
    │   └── Tab: Profile → ProfileScreen
    │
    └── Stack (Modal 层，presentedModally)
        ├── CredentialDetail (push，全屏)
        ├── RevokeConfirmation (push，全屏)
        ├── Renewal (push，全屏)
        ├── Issuance (push，全屏)
        └── Notifications (push)
```

### 5.1 Tab 栏配置


| Tab      | 图标                    | 标签键            |
| -------- | --------------------- | -------------- |
| Wallet   | `Wallet` (lucide)     | `nav.wallet`   |
| Services | `LayoutGrid`          | `nav.services` |
| Scan     | `ScanLine` (中间圆形突出按钮) | `nav.scan`     |
| Activity | `History`             | `nav.activity` |
| Profile  | `UserCircle`          | `nav.profile`  |


---

## 6. 屏幕与功能详细规格

### 6.1 Onboarding（首次引导）

**触发条件**：`authStore.isOnboarded === false`

**步骤流程**：

```
WELCOME → AUTH_SELECT → (BIO_SETUP | PIN_SETUP) → PHONE → (RESTORE_PASSWORD → RESTORE_PROGRESS) | SUCCESS
```

#### Step 1: WELCOME

- 显示 EU Wallet Logo（ShieldCheck 图标，蓝色圆角方块）
- 标题：`onboard.welcome_title`
- 描述：`onboard.welcome_desc`
- 按钮：`onboard.start` → 进入 AUTH_SELECT

#### Step 2: AUTH_SELECT（选择认证方式）

- 标题：`onboard.step_auth`
- **选项 1：生物识别**（Fingerprint 图标）
  - 标签：`onboard.use_bio`，副标题："FaceID / TouchID"
  - 点击后：调用 `expo-local-authentication` 检查设备支持
  - 若支持：显示模拟生物识别扫描动画（pulse + 指纹图标），1.5s 后进入 PHONE 步骤
  - 若不支持：提示用户改用 PIN
- **选项 2：6位 PIN 码**（Lock 图标）
  - 点击后：进入 PIN_SETUP

#### Step 3: PIN_SETUP（设置 PIN）

- 显示 6 个圆点指示器（filled = 已输入）
- 数字键盘（PinPad 组件，1-9 + 0 + 删除）
- 阶段一：输入新 PIN（6位）→ 自动进入阶段二
- 阶段二：确认 PIN（6位）
- 确认按钮：两次 PIN 一致才可点击
- 不一致：显示错误提示 `onboard.pin_mismatch`，清空重试
- 成功后：进入 PHONE

#### Step 4: PHONE（手机验证）

- 手机号输入框（tel 类型，Smartphone 图标前缀）
- "发送验证码"按钮（手机号长度 >= 8 才可点击）
- OTP 输入框（点击发送后出现，6位，等宽字体）
- 30s 倒计时重发提示
- 验证 OTP（Demo：固定码 `123456`）
- 验证成功后：显示"检查备份中"加载遮罩（模拟 API 检查）→ 1.5s 后检测到云备份，进入 RESTORE_PASSWORD
- **注意**：Demo 默认总是找到备份，展示完整恢复流程

#### Step 5: RESTORE_PASSWORD（输入恢复密码）

- 显示 Cloud 图标（弹跳动画）
- 标题：`onboard.backup_found`
- 密码输入框（KeyRound 图标前缀，type=password）
- "恢复备份"按钮（需输入密码才激活）
- "跳过恢复"文字按钮 → 清空 wallet → 进入 SUCCESS

#### Step 6: RESTORE_PROGRESS（恢复进度）

- 圆形进度指示器（0% → 100%）
- 状态文本依次显示：
  - `onboard.status_download`（10%→40%）
  - `onboard.status_verify`（40%→70%）
  - `onboard.status_decrypt`（70%→90%）
  - `onboard.status_import`（90%→100%）
- 完成后：调用 `walletStore.restoreWallet(MOCK_CREDENTIALS)` + `authStore.updateCloudSync(true)` → 进入 SUCCESS

#### Step 7: SUCCESS

- 绿色对勾图标
- 标题（区分：已恢复 vs 全新设置）
- "进入钱包"按钮 → 调用 `authStore.completeOnboarding(profile)` → 进入主界面

---

### 6.2 LockScreen（锁屏）

**触发条件**：`authStore.isOnboarded === true && authStore.isLocked === true`

**实现方式**：RN 中通过导航逻辑控制（不使用 CSS `fixed position`），在 RootNavigator 中条件渲染。

#### 生物识别模式（user.authMethod === 'BIO'）

- 显示 Lock 图标、标题：`lock.title`、描述：`lock.session_expired`
- 大型指纹按钮（tap 触发生物识别）
- 调用 `expo-local-authentication.authenticateAsync()`
- 成功：调用 `authStore.unlockWallet()`
- 失败：显示错误提示，可重试
- 进入此屏幕时自动触发一次生物识别

#### PIN 模式（user.authMethod === 'PIN'）

- 6 个圆点指示器
- PinPad 组件
- 输入 6 位后自动验证：与 `SecureStore` 中存储的 PIN 比对
- 错误：圆点变红，抖动动画，清空，显示 `lock.pin_error`
- 成功：调用 `authStore.unlockWallet()`

#### 非活动自动锁定

- 使用 `useInactivityTimer` Hook
- 监听 `AppState`（foreground/background 切换）和用户交互
- 静止超过 **5 分钟**（`INACTIVITY_LIMIT_MS = 300000`）自动 `setIsLocked(true)`
- App 进入后台后再回到前台，也触发锁屏

---

### 6.3 WalletHome（钱包主页）

**路由**：Tab `Wallet`，默认 Tab 首页

#### 6.3.1 Header 区域

- 左侧：大标题 `wallet.title`，副标题 `wallet.welcome, {nickname}`
- 右侧：通知铃铛按钮
  - 红色小圆点 badge（动态显示未读警告/错误数量）
  - 点击：进入通知列表视图（push）

#### 6.3.2 搜索栏

- 圆角输入框，Search 图标，placeholder：`wallet.search`
- 实时过滤（onChange 绑定）
- 搜索模式下改变列表显示方式（见下文）

#### 6.3.3 分类筛选 Chips（横向滚动）

- ALL / GOVERNMENT / TRANSPORT / HEALTH / UNIVERSITY / BANK / CORPORATE / ENTERTAINMENT
- 当前选中：蓝色填充，其余白色描边
- 横向 ScrollView，隐藏滚动条

#### 6.3.4 字母索引侧边栏（AlphaIndex）

- 竖向排列 `#ABCDEFGHIJKLMNOPQRSTUVWXYZ`
- 点击字母：展开对应凭证所在分组，滚动到目标凭证（FlatList scrollToItem）
- 目标凭证高亮 1.5s（边框高亮动画，用 Animated 或 Reanimated）

#### 6.3.5 凭证列表

**正常模式（非搜索）：按类型分组**

- 分组标题可折叠（点击折叠/展开）
- 折叠标题显示：图层图标 + 类型名称 + 数量 badge + ChevronDown
- 展开时：滑入动画（slide-in-from-top）
- 凭证卡片顶部左侧显示状态标签（Active 绿/Expired 橙/Revoked 红）
- Revoked 凭证：grayscale + 0.75 opacity
- Expired 凭证：grayscale 60% + 0.8 opacity

**搜索模式：平铺列表**

- 去除分组，显示所有匹配结果

**空状态**：Search 图标 + 提示文字

#### 6.3.6 通知系统

通知列表根据凭证状态动态生成：

- **warning**：距到期 <= 30 天（Clock 图标，橙色）
  - 带操作按钮：`notifications.renew` → 跳转 `/renew/:id`
- **error**：已过期（AlertTriangle 图标，红色）或 已撤销（Trash2 图标，红色）
- **success**：近 7 天新增凭证（CheckCircle2 图标，绿色）
- **info**：系统欢迎消息（Info 图标，蓝色）

排序优先级：error > warning > success > info

通知列表 Header：返回按钮 + 标题 `notifications.title`
空状态：Bell 图标 + `notifications.empty`

#### 6.3.7 浮动操作按钮（FAB）

- 固定在右下角（safe area 之上）
- `+` Plus 图标，蓝色圆形，阴影
- 点击：导航至 IssuanceScreen

---

### 6.4 CredentialCard（凭证卡片组件）

**尺寸**：宽度填满容器，宽高比 = 1.586:1（ISO/IEC 7810 ID-1 标准银行卡比例）

**视觉层次**：

- 背景：渐变色（由 `credential.visual.color` 驱动，映射为 RN LinearGradient）
- 左上：小字 "EU DIGITAL WALLET"（全大写，极低透明度）
- 右上：Globe 图标（strokeWidth 1.5，半透明白色）
- 左下：
  - 大字标题 `credential.visual.title`
  - 小字 credential.id（等宽字体，截断）
- 撤销状态覆盖层：黑色半透明 + 旋转的 "REVOKED" 文字 stamp

---

### 6.5 CredentialDetail（凭证详情）

**路由**：Stack push，无 Tab 栏，带返回按钮

#### 6.5.1 Header

- 左：返回按钮（ChevronLeft）
- 中：凭证标题（截断）
- 右：Info 图标（预留）

#### 6.5.2 凭证视觉卡片

- 同 CredentialCard，宽高比 1.586:1
- Revoked 状态：grayscale + opacity 0.75 + REVOKED stamp

#### 6.5.3 验证状态区块

- 未撤销：绿色背景，ShieldCheck 图标，`detail.verified`
- 已撤销：红色背景，AlertCircle 图标，`detail.revoked_msg`

#### 6.5.4 ISO/IEC 23220 数据视图

**Section 1：Metadata**（FileText 图标）

- 凭证类型（credential.type 最后一项，驼峰转空格）
- 凭证 ID（可复制，等宽字体）
- 签发日期（本地化格式：年月日）
- 到期日期（若已过期，红色背景 + "EXPIRED" badge）

**Section 2：Issuer**（UserCheck 图标）

- 机构名称
- 机构 DID（可复制）

**Section 3：Subject**（Fingerprint 图标）

- Subject DID（可复制）

**Section 4：Claims**（List 图标）

- 遍历 `credentialSubject` 中所有字段（跳过 'id'）
- 简单值：DataRow 展示
- 数组：每项独行，缩进展示
- 嵌套对象：键值对展示

#### 6.5.5 AI 解释区块

- 标题 `detail.ai_explain`，BrainCircuit 图标
- 渐变蓝色背景卡片
- 初始状态：显示链接按钮 `detail.ai_explain`
- 点击后：调用 `geminiService.explainCredential()`，显示 loading spinner
- 成功后：显示 AI 文本（fade-in 动画）

#### 6.5.6 凭证历史

- 标题 `detail.history`
- 显示该凭证相关的活动日志（从 MOCK_ACTIVITY_LOGS 过滤）
- 每条：方向图标 + 机构名 + 动作描述 + 日期
- 空状态：`detail.no_history`

#### 6.5.7 底部操作栏（固定在 safe area 底部）

三个按钮：

1. **Present 出示**（主按钮，蓝色，QrCode 图标）
  - 已撤销/已过期：禁用灰色
  - 点击：先显示生物识别验证 overlay（1.5s） → 成功后显示 QR 码 overlay
  - QR overlay：黑色背景，白色卡片，模拟 QR 图案，NFC 图标提示，X 关闭按钮
2. **Share 分享**（蓝色背景，Share2 图标）
  - 已撤销：禁用
  - 点击：显示分享底部弹窗（Sheet），5分钟倒计时
  - 选项：复制链接（Copy）/ 发送邮件（Mail）
3. **Revoke 撤销**（红色背景，Ban 图标）
  - 已撤销：禁用
  - 点击：导航至 RevokeConfirmationScreen

---

### 6.6 ScanScreen（QR 扫描）

**路由**：Tab 中间按钮，以 Modal 方式全屏呈现

#### 相机视图

- 使用 `expo-camera` CameraView
- 尝试获取相机权限：
  - 成功：显示实时摄像头画面
  - 失败：显示灰色背景 + AlertCircle + 提示文字 + Demo 模式说明
- 设置 `facing: 'back'`（后置摄像头）
- 监听 `onBarcodeScanned` 事件（支持 QR 类型）

#### 扫描框 UI

- 半透明背景遮罩，中央镂空正方形区域
- 四角黄色角标（EU 黄 `#FFCE00`）
- 扫描线：红色横线，上下来回动画（Animated.loop）
- 提示文字：`scan.align`

#### 扫描中状态

- 扫描线替换为 pulse 闪烁效果
- 提示文字：`scan.processing`

#### Header

- 顶部透明渐变背景
- 左：X 关闭按钮（navigate back）
- 中：标题 `scan.title`

#### Demo 模式扫描按钮

- Camera 图标按钮（位于底部）
- 点击：模拟扫描，1.5s 后生成 Mock HealthInsuranceCredential offer

#### 凭证接收确认 Modal

触发：扫描成功（真实或模拟）后出现

- 顶部：ShieldCheck 图标 + 标题 `scan.offer`
- 说明文字：`{issuerName} wants_to_add`
- 凭证预览卡片（CredentialCard 样式）
- "Signed by" 文字
- 按钮：
  - `scan.accept`（主按钮，蓝色）→ 调用 `walletStore.addCredential()` → 返回 Wallet 主页
  - `scan.decline`（灰色文字）→ 取消，返回扫描

---

### 6.7 ActivityScreen（活动日志）

**路由**：Tab `Activity`

#### 顶部图表区

- 标题：`activity.disclosures`，右侧绿色 badge "+12%"
- 柱状图（7天，使用 react-native-gifted-charts BarChart）
  - X 轴：Mon ~ Sun
  - 最高列：蓝色（`#003399`），其余：浅灰色
  - 悬停 Tooltip

#### 筛选按钮组（横向 ScrollView）

- ALL / PRESENTED（蓝色）/ RECEIVED（绿色）/ REVOKED（红色）
- 选中态：对应颜色填充
- 未选中：灰色背景

#### 活动日志列表

每条 ActivityLog 卡片：

- 左侧：图标圆圈
  - PRESENTED：ArrowUpRight，蓝色
  - RECEIVED：ArrowDownLeft，绿色
  - REVOKED：Trash2，红色
- 中间：
  - 机构名称（粗体）
  - 凭证图标 + 凭证名称
  - 动作描述（`presented_to` / `received_from` / `revoked`）
- 右侧：本地化时间（月/日 时:分）

空状态：History 图标 + `activity.empty`

---

### 6.8 ServicesScreen（服务市场）

**路由**：Tab `Services`

#### Header

- 标题 `services.title`，副标题 `services.subtitle`

#### 搜索栏

- placeholder：`services.search_placeholder`
- 过滤服务名称和提供商名称

#### 分类 Chips

- ALL / GOV / EDU / HEALTH / TRANSPORT / FINANCE / EMPLOYMENT
- 选中：黑色背景白字（深色主题：白色背景黑字）

#### 服务列表（11项）


| ID       | 图标            | 分类         | 服务名    | 提供商   | 所需数据        |
| -------- | ------------- | ---------- | ------ | ----- | ----------- |
| gov-1    | Scale         | GOV        | 犯罪记录查询 | 司法部   | 姓名、国民身份证    |
| gov-2    | FileText      | GOV        | 税务申报   | 联邦税务局 | 税务ID、收入数据   |
| gov-3    | Building2     | GOV        | 居住证明   | 市政府   | 地址、居住许可     |
| edu-1    | GraduationCap | EDU        | 学历认证   | 教育机构  | 文凭ID        |
| edu-2    | FileText      | EDU        | 成绩单申请  | 大学    | 学生ID        |
| health-1 | Stethoscope   | HEALTH     | 医疗记录访问 | 卫生部   | 健康ID        |
| health-2 | Syringe       | HEALTH     | 接种证明   | 卫生部   | 接种记录        |
| trans-1  | Bus           | TRANSPORT  | 公共交通开通 | 交通局   | 交通卡         |
| trans-2  | AlertTriangle | TRANSPORT  | 交通违章查询 | 警察局   | 驾照、车牌       |
| job-1    | Briefcase     | EMPLOYMENT | 求职身份核验 | 劳工局   | 简历、工作经历     |
| fin-1    | Wallet        | FINANCE    | 银行开户   | 金融机构  | 身份证、地址、信用评分 |


#### 服务处理流程 Modal

点击任一服务后全屏 Modal，自动执行：

1. **CONNECT**（1.5s）：Loader 旋转，`services.step_connect`
2. **AUTH**（2s）：Fingerprint 脉冲，`services.step_auth`
3. **SHARE**（2s）：Loader 旋转，`services.step_share`
4. **SUCCESS**（1.5s）：CheckCircle，`services.step_success`
5. **REDIRECT**（1.5s）：`services.step_redirect` → 关闭 Modal

已完成步骤显示绿色 CheckCircle，当前步骤显示 Loader/动画，未开始步骤半透明。

---

### 6.9 ProfileScreen（个人资料）

**路由**：Tab `Profile`

#### 用户卡片

- 蓝色渐变背景（`#003399` → `#1a56db`）
- 头像：圆形，显示 nickname 前两字或 "AM"
- 姓名：`user.nickname || 'Alex Mustermann'`
- 手机号或邮箱

#### 设置菜单（圆角卡片，分组）

每项：图标 + 标签 + （可选 value 文字）+ ChevronRight


| 图标         | 标签                                | 操作           |
| ---------- | --------------------------------- | ------------ |
| User       | `profile.personal`                | 打开个人信息 Modal |
| Cloud      | `profile.cloud_sync` + 状态（On/Off） | 打开云同步 Modal  |
| Sun/Moon   | `profile.dark_mode` + On/Off      | 切换主题         |
| Globe      | `profile.language` + 当前语言         | 打开语言选择 Modal |
| Lock       | `profile.security`                | 打开安全设置 Modal |
| Shield     | `profile.privacy`                 | 预留（点击无操作）    |
| HelpCircle | `profile.help`                    | 预留           |


#### 登出按钮

- 红色浅色背景，LogOut 图标，全宽圆角按钮

#### Modal 1：个人信息编辑

- Nickname 输入框（User 图标前缀）
- 手机号输入框（Smartphone 图标前缀）
- 保存按钮 → `authStore.updateUser()`

#### Modal 2：安全设置

- 认证方式切换（Biometrics / PIN Code，2列按钮）
- PIN 选项下：显示新 PIN 输入框 + 确认 PIN 输入框
- 保存：PIN 需 6位且两次一致 → `authStore.updateUser()`

#### Modal 3：语言选择

- 6种语言列表（旗帜 emoji + 语言名称）
- 当前选中：蓝色背景 + 白色勾
- 点击切换：`settingsStore.setLanguage()` + 更新 `I18nManager.allowRTL()`（阿拉伯语 RTL）

#### Modal 4：云同步向导（分步）

**未启用状态：**

1. **intro**：介绍云备份功能 → "下一步"
2. **bio**：生物识别验证（调用 expo-local-authentication）→ 通过后进入下一步
3. **password**：设置加密密码（需 >= 4位，两次一致）→ 确认
4. **syncing**：加密中（1.5s）→ 上传中（2s）
5. **success**：绿色对勾，同步成功 → "完成"

**已启用状态（manage 视图）：**

- 显示上次同步时间
- "立即同步"按钮
- "禁用同步"按钮（confirm dialog）

#### Modal 5：登出确认（2步）

1. **confirm**：AlertTriangle + 警告文字 + "删除并退出"红色按钮
2. **bio**：生物识别验证 → 成功后：`walletStore.clearWallet()` + `authStore.logout()`

---

### 6.10 IssuanceScreen（添加新凭证）

**路由**：FAB 点击，Stack push

#### 分类网格（2列）

9种类别：


| 类别            | 图标             | 颜色  | 描述                           |
| ------------- | -------------- | --- | ---------------------------- |
| government    | Landmark       | 蓝色  | ID, Residency, Licenses      |
| education     | GraduationCap  | 紫色  | Diplomas, Certifications     |
| health        | HeartPulse     | 玫红  | Insurance, Prescriptions     |
| business      | Briefcase      | 深灰  | Employee ID, Access          |
| entertainment | Music          | 粉色  | Event Tickets, Memberships   |
| finance       | Banknote       | 绿色  | Account Proof, Credit Score  |
| science       | FlaskConical   | 青色  | Research Grants, Lab Access  |
| technology    | Cpu            | 靛蓝  | Developer Certs, Access Keys |
| other         | MoreHorizontal | 灰色  | Loyalty, Custom              |


点击任一类别后模拟 **OpenID4VCI** 流程（全屏覆盖）：

进度状态机：

1. **connecting**（1.5s）：`issue.connecting`
2. **authenticating**（1.5s）：`issue.authenticating`
3. **issuing**（2s）：`issue.issuing`
4. **success**（1.5s）：绿色 CheckCircle，`issue.success` → 自动返回主页

每步：圆形旋转 spinner（BorderBlue），中心 ShieldCheck pulse 图标

进度步骤指示器（小圆点 + 连接线）

---

### 6.11 RenewalScreen（凭证续期）

**路由**：通知操作按钮触发，Stack push，参数 `id: string`

**状态机**：idle → processing → success

**idle 视图**：

- RefreshCw 图标（蓝色圆圈背景）
- 凭证标题
- 当前到期日（红色，等宽字体）
- "立即续期"按钮（CalendarDays 图标）

**processing 视图**：

- 旋转 spinner（同 Issuance）
- 状态文字：`notifications.renew_desc`

**success 视图**：

- 绿色 CheckCircle
- 新到期年份（+5年）
- "返回钱包"按钮

成功后调用：`walletStore.updateCredential(id, { expirationDate: newDate, status: 'active' })`

---

### 6.12 RevokeConfirmationScreen（凭证撤销确认）

**路由**：CredentialDetail 撤销按钮触发，Stack push，参数 `id: string`

**步骤**：confirm → auth → success

**confirm 视图**：

- AlertTriangle（红色圆圈背景）
- 确认文字 `detail.are_you_sure` + `detail.revocation_intro` + `detail.revocation_warning`
- 红色"确认撤销"按钮（Trash2 图标）+ 取消按钮

**auth 视图（自动触发，2s 模拟）**：

- 指纹扫描动画（pulse + ping 圆环）

**success 视图**：

- 绿色 CheckCircle
- `common.success_revoke` + `detail.revocation_success_msg`
- "返回钱包"按钮

成功后调用：`walletStore.revokeCredential(id)`

---

## 7. 全局状态管理

使用 **Zustand** 替代 React Context，保持简洁。

### 7.1 authStore

```typescript
interface AuthState {
  isOnboarded: boolean;
  isLocked: boolean;
  user: UserProfile | null;
  cloudSync: CloudSyncState;

  // Actions
  completeOnboarding: (profile: UserProfile) => void;
  unlockWallet: () => void;
  lockWallet: () => void;
  logout: () => void;
  updateUser: (updates: Partial<UserProfile>) => void;
  updateCloudSync: (enabled: boolean, date?: string) => void;

  // 持久化
  hydrate: () => Promise<void>;  // 从 AsyncStorage 加载
}
```

### 7.2 walletStore

```typescript
interface WalletState {
  credentials: VerifiableCredential[];

  // Actions
  revokeCredential: (id: string) => void;
  getCredential: (id: string) => VerifiableCredential | undefined;
  addCredential: (credential: VerifiableCredential) => void;
  updateCredential: (id: string, updates: Partial<VerifiableCredential>) => void;
  restoreWallet: (credentials: VerifiableCredential[]) => void;
  clearWallet: () => void;
}
```

### 7.3 settingsStore

```typescript
interface SettingsState {
  theme: 'light' | 'dark';
  language: Language;  // 'en' | 'zh' | 'es' | 'fr' | 'pt' | 'ar'

  // Actions
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  hydrate: () => Promise<void>;
}
```

---

## 8. 原生能力集成

### 8.1 生物识别（expo-local-authentication）

```typescript
// biometricService.ts
import * as LocalAuthentication from 'expo-local-authentication';

export const isBiometricSupported = async (): Promise<boolean> => {
  const supported = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return supported && enrolled;
};

export const authenticateWithBiometric = async (promptMessage: string): Promise<boolean> => {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    fallbackLabel: '使用 PIN 码',
    disableDeviceFallback: false,  // 允许 PIN 作为降级
  });
  return result.success;
};
```

**使用场景**：

- 解锁钱包（LockScreen，BIO 模式）
- 出示凭证（CredentialDetail）
- 启用云同步（Profile Modal）
- 登出验证（Profile Modal）
- 凭证撤销（RevokeConfirmation）

### 8.2 安全存储（expo-secure-store）

```typescript
// 存储 PIN 码（Keychain / Keystore）
await SecureStore.setItemAsync('wallet_pin', pin);
const pin = await SecureStore.getItemAsync('wallet_pin');

// 存储云备份加密密码
await SecureStore.setItemAsync('cloud_backup_key', password);
```

**规则**：

- PIN 码和加密密钥 **只存** SecureStore，**不存** AsyncStorage
- 用户资料（nickname、phone）存 AsyncStorage
- 钱包数据存 AsyncStorage（暂不加密，生产环境需加密）

### 8.3 相机（expo-camera）

```typescript
import { CameraView, useCameraPermissions } from 'expo-camera';

// 权限请求
const [permission, requestPermission] = useCameraPermissions();

// 扫码回调
<CameraView
  style={StyleSheet.absoluteFillObject}
  facing="back"
  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
  onBarcodeScanned={handleBarcodeScanned}
/>
```

**权限处理**：

- 首次：请求相机权限弹窗
- 拒绝：显示 Demo 模式提示，允许手动触发模拟扫描

### 8.4 触觉反馈（expo-haptics）


| 操作         | 类型                                                            |
| ---------- | ------------------------------------------------------------- |
| PIN 输入每位数字 | `Haptics.selectionAsync()`                                    |
| PIN 错误     | `Haptics.notificationAsync(NotificationFeedbackType.Error)`   |
| PIN 成功/解锁  | `Haptics.notificationAsync(NotificationFeedbackType.Success)` |
| 接受凭证       | `Haptics.notificationAsync(NotificationFeedbackType.Success)` |
| 撤销凭证       | `Haptics.impactAsync(ImpactFeedbackStyle.Heavy)`              |
| Tab 切换     | `Haptics.selectionAsync()`                                    |


### 8.5 AppState 监听（非活动计时器）

```typescript
// useInactivityTimer.ts
import { AppState } from 'react-native';

useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'background' || nextState === 'inactive') {
      // 进入后台记录时间
      backgroundTimeRef.current = Date.now();
    } else if (nextState === 'active') {
      // 回到前台检查是否超过 5 分钟
      const elapsed = Date.now() - (backgroundTimeRef.current || 0);
      if (elapsed > INACTIVITY_LIMIT_MS) {
        authStore.lockWallet();
      }
    }
  });
  return () => subscription.remove();
}, []);
```

---

## 9. 国际化（i18n）

### 9.1 支持语言


| 语言        | 代码   | 文字方向    |
| --------- | ---- | ------- |
| English   | `en` | LTR     |
| 中文        | `zh` | LTR     |
| Español   | `es` | LTR     |
| Français  | `fr` | LTR     |
| Português | `pt` | LTR     |
| العربية   | `ar` | **RTL** |


### 9.2 实现方案

使用 **i18n-js** 或 **react-i18next**（轻量），结合 `expo-localization` 获取设备语言。

```typescript
// i18n/index.ts
import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';
import i18n from 'i18n-js';

// 切换语言时更新 RTL
export const setAppLanguage = (lang: Language) => {
  i18n.locale = lang;
  const isRTL = lang === 'ar';
  I18nManager.allowRTL(isRTL);
  I18nManager.forceRTL(isRTL);
  // 注意：RTL 切换需要重启 App 生效（可提示用户）
};
```

### 9.3 翻译文件结构

翻译键名与 Web 版保持一致（见 LanguageContext.tsx 中的 TRANSLATIONS 对象）：

```typescript
// en.ts（简要示例）
export default {
  nav: { wallet: 'Wallet', services: 'Services', scan: 'Scan', activity: 'Activity', profile: 'Profile' },
  wallet: { title: 'My Wallet', welcome: 'Welcome back', search: 'Search credentials...', ... },
  scan: { title: 'Scan QR Code', ... },
  activity: { title: 'Activity Log', ... },
  services: { title: 'Service Market', ... },
  profile: { title: 'Profile', ... },
  onboard: { welcome_title: 'Your Digital Identity', ... },
  lock: { title: 'Wallet Locked', ... },
  detail: { present: 'Present', share: 'Share', revoke: 'Revoke', ... },
  notifications: { title: 'Notifications', ... },
  cloud: { title: 'Cloud Backup', ... },
  issue: { title: 'Add Credential', ... },
  common: { cancel: 'Cancel', confirm: 'Confirm', done: 'Done', ... },
}
```

### 9.4 RTL 布局适配

在所有 `flexDirection: 'row'` 的组件上使用：

- `flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row'`
- 或使用 `marginStart` / `marginEnd`（自动适配 RTL）替代 `marginLeft` / `marginRight`
- `textAlign` 使用 `'left'`（RN 会自动映射到 RTL 的 `right`）
- 图标翻转：ChevronRight 在 RTL 下 `transform: [{ scaleX: -1 }]`

---

## 10. 主题与样式

### 10.1 颜色系统

```typescript
// constants/colors.ts
export const COLORS = {
  // EU 品牌色
  euBlue: '#003399',        // 主蓝色
  euYellow: '#FFCE00',      // 欧盟黄（扫描框角标）

  // Light Theme
  light: {
    background: '#F9FAFB',  // gray-50
    surface: '#FFFFFF',
    border: '#E5E7EB',       // gray-200
    text: '#111827',         // gray-900
    textSecondary: '#6B7280', // gray-500
    tabBar: '#FFFFFF',
  },

  // Dark Theme
  dark: {
    background: '#111827',   // gray-900
    surface: '#1F2937',      // gray-800
    border: '#374151',       // gray-700
    text: '#F9FAFB',         // gray-50
    textSecondary: '#9CA3AF', // gray-400
    tabBar: '#111827',
  },

  // 状态色
  success: '#22C55E',
  warning: '#F97316',
  error: '#EF4444',
  info: '#3B82F6',
};
```

### 10.2 凭证渐变色映射

Web 版使用 Tailwind 渐变类，RN 使用 `expo-linear-gradient` 映射：

```typescript
// 凭证颜色字符串到 RN LinearGradient 的映射
export const CREDENTIAL_GRADIENTS: Record<string, [string, string]> = {
  'bg-gradient-to-br from-blue-800 to-blue-600': ['#1e40af', '#2563eb'],
  'bg-gradient-to-br from-emerald-700 to-teal-600': ['#065f46', '#0d9488'],
  'bg-gradient-to-br from-purple-800 to-indigo-700': ['#6b21a8', '#4338ca'],
  'bg-gradient-to-br from-rose-600 to-pink-600': ['#e11d48', '#db2777'],
  // ... 完整映射所有 20 种凭证颜色
};
```

### 10.3 动画替代方案

Web 版 CSS 动画 → React Native 动画：


| CSS 动画                            | RN 替代                                                 |
| --------------------------------- | ----------------------------------------------------- |
| `animate-pulse`                   | `Animated.loop(Animated.sequence([opacity 0.5↔1]))`   |
| `animate-spin`                    | `Animated.loop(Animated.timing(rotation))`            |
| `animate-ping`                    | `Animated.loop(Animated.sequence([scale + opacity]))` |
| `animate-in fade-in`              | `Animated.timing(opacity, {from: 0, to: 1})`          |
| `animate-in slide-in-from-bottom` | `Animated.spring(translateY)`                         |
| `animate-in zoom-in`              | `Animated.spring(scale, {from: 0.9, to: 1})`          |
| `transition-all`                  | `Animated.timing()` in layout callbacks               |


推荐使用 **react-native-reanimated v3** + **react-native-gesture-handler** 处理复杂动画。

### 10.4 主题切换

使用 `react-native-appearance` 或直接通过 `settingsStore.theme` 控制：

- 每个屏幕通过 `useTheme()` Hook 获取当前颜色方案
- 不使用 CSS 变量，而是运行时动态切换样式对象

---

## 11. AI 集成（Gemini）

### 11.1 服务封装

```typescript
// services/geminiService.ts
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });
const MODEL = 'gemini-2.5-flash';

export const explainCredential = async (credential: VerifiableCredential): Promise<string> => {
  if (!apiKey) return 'API Key not configured.';

  const prompt = `...（同 Web 版 prompt 内容）...`;

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt });
  return response.text || 'Could not generate explanation.';
};

export const verifyCredentialIntegrity = async (credential: VerifiableCredential)
  : Promise<{isValid: boolean, reason: string}> => {
  if (!apiKey) return { isValid: true, reason: 'Verification simulated.' };

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });

  return JSON.parse(response.text || '{}');
};
```

### 11.2 UI 交互

- 凭证详情页：按需触发（用户点击按钮）
- Loading：旋转 spinner + pulse 文字
- 错误：显示 "AI Explanation unavailable"
- 无 API Key：显示占位提示（不崩溃）

---

## 12. 安全要求

### 12.1 PIN 存储

- **必须**使用 `expo-secure-store`（iOS Keychain，Android Keystore）存储 PIN
- 不得存入 AsyncStorage 或明文日志

### 12.2 锁屏机制

- App 启动时：若已 onboarded，默认进入锁屏
- App 从后台切回：若离开 > 5分钟，触发锁屏
- 前台静止 5分钟（AppState 监听 + 手势事件计时）触发锁屏

### 12.3 凭证操作需身份验证

以下操作必须先通过生物识别或 PIN 验证：

- 出示凭证（生成 QR 码前）
- 撤销凭证（撤销确认前）
- 登出（清除数据前）
- 启用云同步（加密前）

### 12.4 云备份

- 备份数据使用用户设置的密码加密（AES-256，使用 `expo-crypto`）
- 密码/密钥存储在 SecureStore，备份文件存储在云端（Demo 中模拟）

### 12.5 ★ DID 私钥安全

- DID 私钥 **只存** SecureStore，访问级别设为 `requireAuthentication: true`
- 禁止将私钥写入日志、剪贴板、AsyncStorage 或任何非加密存储
- 云备份中的私钥必须使用 AES-256-GCM 加密，密钥派生使用 PBKDF2（迭代 >= 100,000）
- 每个 DID 密钥对使用独立的 SecureStore 键名，防止批量泄露
- 当用户「登出并删除数据」时，必须调用 `SecureStore.deleteItemAsync` 清除所有 DID 私钥

### 12.6 ★ 推送通知安全

- 推送令牌（Expo Push Token）与 DID 的绑定关系在后端使用加密存储
- 后端推送接口必须通过服务间认证（JWT 或 API Key），不对外公开
- 通知 payload 不得包含凭证私密内容（如完整凭证 JSON），只携带凭证 ID 和操作指令
- APNs / FCM 通信强制使用 TLS；Expo Push API 通信同样使用 HTTPS

---

## 13. 持久化存储策略


| 数据                        | 存储位置                | 加密              |
| ------------------------- | ------------------- | --------------- |
| PIN 码                     | `expo-secure-store` | ✅ OS 级别         |
| 云备份密钥                     | `expo-secure-store` | ✅ OS 级别         |
| **★ DID 私钥（privateKeyBase64）** | `expo-secure-store` | ✅ OS 级别（Keychain/Keystore） |
| 用户信息（nickname、phone）      | `AsyncStorage`      | ❌              |
| 认证方式                      | `AsyncStorage`      | ❌              |
| 云同步状态                     | `AsyncStorage`      | ❌              |
| 钱包凭证列表                    | `AsyncStorage`      | ❌（生产环境建议加密）    |
| 主题设置                      | `AsyncStorage`      | ❌              |
| 语言设置                      | `AsyncStorage`      | ❌              |
| **★ DID 元数据（公钥缓存）**       | `AsyncStorage`      | ❌（仅公开信息）       |
| **★ Expo 推送令牌**            | `AsyncStorage`      | ❌              |
| **★ 本地通知记录**              | `AsyncStorage`      | ❌              |


### AsyncStorage 键名约定

```typescript
const STORAGE_KEYS = {
  IS_ONBOARDED: 'eu_wallet_onboarded',
  USER_PROFILE: 'eu_wallet_user',
  CLOUD_SYNC: 'eu_wallet_cloud_sync',
  CREDENTIALS: 'eu_wallet_credentials',
  THEME: 'eu_wallet_theme',
  LANGUAGE: 'eu_wallet_language',
  // ★ DID 相关
  DID_METADATA: 'eu_wallet_did_metadata',        // DIDMetadata JSON
  // ★ 推送通知相关
  PUSH_TOKEN: 'eu_wallet_push_token',            // Expo Push Token 字符串
  NOTIFICATIONS: 'eu_wallet_notifications',      // PushNotificationRecord[] JSON
} as const;

// ★ SecureStore 键名约定（私密数据）
const SECURE_KEYS = {
  WALLET_PIN: 'eu_wallet_pin',
  CLOUD_BACKUP_KEY: 'eu_wallet_cloud_key',
  // DID 私钥使用 keyId 作为键名，支持多 DID 并存
  DID_PRIVATE_KEY_PREFIX: 'eu_wallet_did_pk_',  // + keyId 后缀
} as const;
```

---

## 14. 构建与运行配置

### 14.1 Development Build 构建步骤

```bash
# 安装依赖
npm install
# 或
yarn install

# 生成原生项目（首次或 native 依赖变更后）
npx expo prebuild --clean

# iOS
npx expo run:ios

# Android
npx expo run:android

# 启动 Metro bundler（用于已构建的 dev client）
npx expo start --dev-client
```

### 14.2 重要配置注意事项

1. **不使用 EAS**：所有构建在本地执行，不依赖 Expo 云构建服务
2. **expo-dev-client**：必须安装以支持自定义原生模块（LocalAuthentication、SecureStore、Camera）
3. **原生模块变更**：每次新增 Expo 插件需重新 `expo prebuild` 并重新编译原生项目
4. **iOS 签名**：本地开发使用 Xcode 自动签名（Development Team 设置），无需 EAS Credentials
5. **Android 签名**：本地 debug 构建使用 debug keystore

### 14.3 环境变量配置

```bash
# .env（本地，不提交到 git）
EXPO_PUBLIC_GEMINI_API_KEY=AIza...

# app.config.ts 中读取
process.env.EXPO_PUBLIC_GEMINI_API_KEY
```

---

## 15. Mock 数据规格

### 15.1 凭证列表（20条）

详细数据在 `constants/mockData.ts` 中实现，覆盖以下类型：


| #   | 类型                         | 发行机构                    | 状态          | 备注                        |
| --- | -------------------------- | ----------------------- | ----------- | ------------------------- |
| 1   | PermanentResidentCard      | EU Identity Service     | active      | 政府身份证                     |
| 2   | Iso18013DriversLicense (B) | Federal Motor Transport | active      | 汽车驾照                      |
| 3   | Iso18013DriversLicense (A) | Federal Motor Transport | active      | 摩托车驾照                     |
| 4   | UniversityDegree (BSc)     | Sorbonne University     | active      | 本科学历                      |
| 5   | UniversityDegree (MBA)     | TU Munich               | active      | 研究生学历                     |
| 6   | HealthInsurance            | Allianz Care            | active      | 即将到期（+365天）               |
| 7   | VaccinationCertificate     | Ministry of Health      | active      | 疫苗接种证书                    |
| 8   | OrganDonor                 | National Transplant Org | active      | 器官捐献意愿                    |
| 9   | PilotLicense               | EASA                    | active      | **即将到期（+30天）**，触发 warning |
| 10  | PublicTransportPass        | Deutsche Bahn           | active      | **即将到期（+5天）**，触发 warning  |
| 11  | BankAccount                | Sparkasse Berlin        | active      | 银行账户                      |
| 12  | CreditScore                | SCHUFA                  | active      | 信用评分                      |
| 13  | EmployeeCredential         | EuroTech Solutions      | active      | 员工 ID                     |
| 14  | SecurityClearance          | Federal Security Office | active      | 安全许可（到期日 2024）            |
| 15  | LibraryCard                | Berlin State Library    | **revoked** | 已撤销                       |
| 16  | MuseumPass                 | National Museums        | active      | 博物馆通票                     |
| 17  | GymMembership              | FitLife Europe          | active      | 健身房会员                     |
| 18  | TaxIdentification          | Federal Tax Office      | active      | 税务 ID                     |
| 19  | ResidentPermit             | City of Munich          | active      | 居住许可                      |
| 20  | ProfessionalCertification  | Chamber of Engineers    | active      | 专业工程师证书                   |


### 15.2 活动日志（6条）


| #   | 动作        | 凭证    | 机构                      | 时间    |
| --- | --------- | ----- | ----------------------- | ----- |
| 1   | PRESENTED | 数字身份证 | Supermarket Chain A     | 30分钟前 |
| 2   | RECEIVED  | 驾照    | Federal Motor Transport | 2天前   |
| 3   | PRESENTED | 大学文凭  | Job Application Portal  | 5天前   |
| 4   | REVOKED   | 图书馆卡  | City Library            | 10天前  |
| 5   | PRESENTED | 数字身份证 | Airport Border Control  | 15天前  |
| 6   | PRESENTED | 数字身份证 | Hotel Check-In          | 20天前  |


### 15.3 图表数据（7天）


| 星期      | 出示次数        |
| ------- | ----------- |
| Mon     | 2           |
| Tue     | 5           |
| Wed     | 1           |
| Thu     | 3           |
| Fri     | 4           |
| **Sat** | **8**（高亮蓝色） |
| Sun     | 2           |


---

## 16. DID 密钥对生成与管理

> **核心原则**：私钥永不离开设备；后端只存储公钥与 DID 文档；所有传输使用 TLS + 请求签名双重保护。

### 16.1 功能概述

当用户完成 Onboarding（首次引导）后，系统自动在本地生成一个 Ed25519 密钥对，用于：

1. **构建用户专属 DID**（`did:key` 方法，可选升级为 `did:ebsi`）
2. **凭证验证签名**：出示凭证时对 VP（Verifiable Presentation）签名
3. **端对端加密信道**：未来扩展的 DIDComm 消息加密

### 16.2 密钥对生成流程

```
Onboarding SUCCESS
       │
       ▼
[didService.generateDIDKeyPair()]
       │
       ├─ 1. 生成 Ed25519 密钥对（原生 crypto / @noble/ed25519）
       │      privateKey: Uint8Array (32 bytes)
       │      publicKey:  Uint8Array (32 bytes)
       │
       ├─ 2. 构建 DID 标识符（did:key 方法）
       │      multicodecPrefix = 0xed01  (Ed25519 公钥前缀)
       │      multibase = 'z' + Base58btc(multicodecPrefix + publicKey)
       │      did = 'did:key:' + multibase
       │
       ├─ 3. 私钥安全本地存储
       │      SecureStore.setItemAsync(
       │        SECURE_KEYS.DID_PRIVATE_KEY_PREFIX + keyId,
       │        Base64url(privateKey)
       │      )
       │      // keyId = did + '#' + multibase
       │
       ├─ 4. 构建 DID Document（W3C 标准）
       │      含 verificationMethod、authentication、assertionMethod
       │
       ├─ 5. 上传 DID Document 到后端注册中心
       │      POST /api/did/register
       │      Headers: { Authorization: 'Bearer <初始注册令牌>' }
       │      Body: { didDocument, signature: sign(did, privateKey) }
       │
       └─ 6. 本地缓存 DID 元数据（AsyncStorage）
              DIDMetadata { did, publicKeyMultibase, registeredAt, status }
```

### 16.3 didService.ts 实现方案

```typescript
// services/didService.ts
import * as SecureStore from 'expo-secure-store';
import { ed25519 } from '@noble/ed25519';
import { base58btc } from 'multiformats/bases/base58';

// ─── 常量 ────────────────────────────────────────────
const ED25519_MULTICODEC_PREFIX = new Uint8Array([0xed, 0x01]);
const REGISTRY_URL = process.env.EXPO_PUBLIC_DID_REGISTRY_URL!;

// ─── 生成密钥对 + DID ────────────────────────────────
export async function generateDIDKeyPair(): Promise<{
  did: string;
  metadata: DIDMetadata;
}> {
  // 1. 生成私钥（32字节随机数）
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey  = await ed25519.getPublicKey(privateKey);

  // 2. 构造 DID key
  const multicodecKey  = new Uint8Array([...ED25519_MULTICODEC_PREFIX, ...publicKey]);
  const publicKeyMultibase = 'z' + base58btc.encode(multicodecKey);
  const did = `did:key:${publicKeyMultibase}`;
  const keyId = `${did}#${publicKeyMultibase}`;

  // 3. 私钥存入 SecureStore（OS Keychain/Keystore 加密）
  const privateKeyBase64 = Buffer.from(privateKey).toString('base64url');
  await SecureStore.setItemAsync(
    `eu_wallet_did_pk_${keyId}`,
    privateKeyBase64,
    {
      requireAuthentication: true,   // 访问需要生物识别或 PIN
      authenticationPrompt: '请验证身份以访问 DID 密钥',
    }
  );

  // 4. 构建 DID Document
  const didDocument: DIDDocument = {
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: did,
    verificationMethod: [{
      id: keyId,
      type: 'Ed25519VerificationKey2020',
      controller: did,
      publicKeyMultibase,
    }],
    authentication: [keyId],
    assertionMethod: [keyId],
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };

  // 5. 对 DID Document 哈希进行签名（证明私钥持有）
  const docHash = await digestSHA256(JSON.stringify(didDocument));
  const signature = await ed25519.sign(docHash, privateKey);

  // 6. 上传到 DID 注册中心（后端仅保存公钥 + DID Doc）
  await registerDIDDocument(didDocument, signature);

  // 7. 本地缓存元数据（不含私钥）
  const metadata: DIDMetadata = {
    did,
    method: 'did:key',
    algorithm: 'Ed25519',
    keyId,
    publicKeyMultibase,
    registeredAt: new Date().toISOString(),
    status: 'active',
  };

  return { did, metadata };
}

// ─── 签名（用于凭证出示） ────────────────────────────
export async function signWithDID(
  payload: Uint8Array,
  keyId: string
): Promise<Uint8Array> {
  const privateKeyBase64 = await SecureStore.getItemAsync(
    `eu_wallet_did_pk_${keyId}`,
    { requireAuthentication: true }
  );
  if (!privateKeyBase64) throw new Error('Private key not found');
  const privateKey = Buffer.from(privateKeyBase64, 'base64url');
  return ed25519.sign(payload, privateKey);
}

// ─── 后端注册 DID Document ──────────────────────────
async function registerDIDDocument(
  didDocument: DIDDocument,
  signature: Uint8Array
): Promise<void> {
  const response = await fetch(`${REGISTRY_URL}/api/did/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-DID-Signature': Buffer.from(signature).toString('base64url'),
    },
    body: JSON.stringify({ didDocument }),
  });
  if (!response.ok) {
    throw new Error(`DID registration failed: ${response.status}`);
  }
}

// ─── 密钥轮换（高级功能） ────────────────────────────
export async function rotateDIDKey(oldKeyId: string): Promise<DIDMetadata> {
  // 1. 生成新密钥对
  // 2. 用旧私钥签名「密钥轮换声明」
  // 3. 提交到后端，标记旧 DID 为 rotated
  // 4. 旧私钥从 SecureStore 删除
  // 5. 返回新 DIDMetadata
  throw new Error('Key rotation: implementation required');
}
```

### 16.4 后端 DID 注册接口规格

#### POST /api/did/register

**请求**
```json
{
  "didDocument": { /* W3C DID Document */ },
  "clientInfo": {
    "appVersion": "1.0.0",
    "platform": "ios"
  }
}
```
**请求头**
```
Content-Type: application/json
X-DID-Signature: <Base64url(ed25519.sign(SHA256(didDocument), privateKey))>
```

**成功响应 201**
```json
{
  "did": "did:key:z6Mk...",
  "registeredAt": "2026-03-19T10:00:00Z",
  "resolverUrl": "https://resolver.example.com/did:key:z6Mk..."
}
```

**错误响应**
```json
{ "error": "DID_ALREADY_EXISTS" }   // 409
{ "error": "INVALID_SIGNATURE" }    // 401
{ "error": "INVALID_DID_DOCUMENT" } // 422
```

#### GET /api/did/resolve/:did

返回后端存储的 DID Document（公开接口，无需鉴权）。

#### PATCH /api/did/:did/deactivate

撤销 DID（需提供有效签名），返回 200。

### 16.5 Zustand didStore

```typescript
// store/didStore.ts
interface DIDState {
  did: string | null;
  metadata: DIDMetadata | null;
  isGenerating: boolean;
  error: string | null;

  // Actions
  generateAndRegisterDID: () => Promise<void>;
  loadDIDFromCache: () => Promise<void>;
  rotateDIDKey: () => Promise<void>;
  clearDID: () => void;
}
```

### 16.6 Onboarding 集成

在 **Step 7: SUCCESS** 视图渲染前，后台静默执行：

```
SUCCESS 步骤显示动画期间（约 1.5s）
  │
  ├─ didStore.generateAndRegisterDID()
  │    ├─ 成功：缓存 DIDMetadata → 继续进入主界面
  │    └─ 失败（网络离线）：本地生成并缓存，标记 pendingUpload = true
  │                         App 联网后重试上传（后台任务）
  │
  └─ 主界面 ProfileScreen 展示用户 DID 标识符
```

### 16.7 安全约束补充

| 约束项                    | 规则                                         |
| ---------------------- | ------------------------------------------ |
| 私钥访问                   | 必须通过生物识别或 PIN（`requireAuthentication: true`） |
| 私钥备份                   | 禁止导出到剪贴板、截图、日志；云备份中加密存储（AES-256-GCM）      |
| 公钥传输                   | 使用 TLS 1.3 + 请求签名双重保护                      |
| DID 与手机号关联             | 后端存储关联关系时使用单向哈希，不明文存储手机号                   |
| SecureStore 生物识别要求等级   | iOS: `kSecAccessControlBiometryCurrentSet` |
|                        | Android: `BIOMETRIC_STRONG`                |

---

## 17. 双端推送通知系统

> **目标**：无论 App 处于前台、后台还是完全关闭，用户均能及时收到凭证状态变更、验证请求等关键通知。

### 17.1 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                         后端服务                                  │
│                                                                  │
│  业务事件触发器         推送调度服务            DID Registry        │
│  (凭证到期检查 / ─────► (Expo Push API /  ◄──── (设备令牌表)        │
│   第三方核验请求)        FCM / APNs)                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
     ┌─────────┐    ┌─────────────┐  ┌──────────┐
     │  Expo   │    │  FCM（GCM） │  │  APNs    │
     │  Push   │    │  Android    │  │   iOS    │
     │ Service │    └─────┬───────┘  └────┬─────┘
     └────┬────┘          │               │
          │               ▼               ▼
          └──────►  ┌─────────────────────────┐
                    │    React Native App      │
                    │                          │
                    │  前台：应用内横幅通知       │
                    │  后台：系统通知栏           │
                    │  关闭：系统通知栏（静默/可见）│
                    └─────────────────────────┘
```

### 17.2 推送令牌注册流程

```typescript
// services/pushNotificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// ─── 配置通知处理行为 ─────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,    // 前台时显示横幅
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── 注册推送令牌 ──────────────────────────────────────
export async function registerForPushNotifications(
  userDID: string
): Promise<string | null> {
  // 1. 必须是物理设备（模拟器不支持远程推送）
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  // 2. 请求通知权限
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  // 3. 获取 Expo Push Token（包含项目 ID）
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-expo-project-id',  // 来自 app.json extra.eas.projectId
  });
  const expoPushToken = tokenData.data;

  // 4. Android 专用：设置通知渠道
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'EU Wallet',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#003399',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    await Notifications.setNotificationChannelAsync('credentials', {
      name: '凭证状态变更',
      description: '证件到期、撤销、新凭证',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  // 5. 上传令牌到后端（与 DID 绑定）
  await uploadPushToken({
    userId: userDID,
    expoPushToken,
    platform: Platform.OS as 'ios' | 'android',
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
  });

  // 6. 本地缓存令牌
  await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, expoPushToken);

  return expoPushToken;
}

// ─── 上传令牌到后端 ────────────────────────────────────
async function uploadPushToken(token: Omit<DevicePushToken, 'registeredAt' | 'lastActiveAt'>): Promise<void> {
  await fetch(`${process.env.EXPO_PUBLIC_PUSH_SERVER_URL}/api/push/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...token,
      registeredAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    }),
  });
}
```

### 17.3 前台通知处理（App 运行中）

```typescript
// hooks/usePushNotifications.ts
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';

export function usePushNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener     = useRef<Notifications.EventSubscription>();
  const navigation = useNavigation();

  useEffect(() => {
    // 监听收到通知（App 在前台时触发）
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const { category, data } = notification.request.content;
        // 存储到 notificationStore
        notificationStore.getState().addNotification({
          id:         notification.request.identifier,
          category:   category as PushNotificationCategory,
          title:      notification.request.content.title ?? '',
          body:       notification.request.content.body  ?? '',
          data:       data as Record<string, any>,
          receivedAt: new Date().toISOString(),
          isRead:     false,
        });
      }
    );

    // 监听用户点击通知（含后台/关闭状态下点击）
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        handleNotificationDeepLink(data, navigation);
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}

// ─── 通知深度链接路由 ─────────────────────────────────
function handleNotificationDeepLink(
  data: Record<string, any>,
  navigation: any
): void {
  switch (data.action) {
    case 'OPEN_CREDENTIAL':
      navigation.navigate('CredentialDetail', { id: data.credentialId });
      break;
    case 'OPEN_RENEWAL':
      navigation.navigate('Renewal', { id: data.credentialId });
      break;
    case 'OPEN_SCAN':
      navigation.navigate('Scan');
      break;
    case 'OPEN_NOTIFICATIONS':
      navigation.navigate('Notifications');
      break;
    default:
      navigation.navigate('WalletHome');
  }
}
```

### 17.4 后台 / App 关闭时的通知接收

React Native 原生推送在 App 关闭时由 **系统（FCM / APNs）** 直接派发，无需 App 运行。关键配置：

#### iOS（APNs 后台推送）

```typescript
// app.config.ts — iOS 推送能力
{
  ios: {
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],  // 开启后台推送接收
    },
    entitlements: {
      'aps-environment': 'development',  // production 环境改为 'production'
    }
  }
}
```

iOS 后台静默推送（`content-available: 1`）允许 App 在后台获取数据更新，再展示本地通知；可见推送（`alert`）由系统直接展示，无需 App 唤起。

#### Android（FCM 后台推送）

FCM 的 `data` 消息（无 `notification` 字段）在 App 后台/关闭时会唤醒 `FirebaseMessagingService`（由 Expo 自动配置）。配置 `google-services.json` 后无需额外代码。

```json
// FCM 后台消息体示例（服务端发送）
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "priority": "high",
  "data": {
    "action": "OPEN_CREDENTIAL",
    "credentialId": "urn:uuid:abc-123",
    "category": "CREDENTIAL_EXPIRY"
  },
  "notification": {
    "title": "凭证即将到期",
    "body": "您的驾照将在 5 天后到期，请及时续期。",
    "android_channel_id": "credentials"
  }
}
```

### 17.5 后端推送调度服务规格

#### 推送触发场景

| 触发事件              | 通知类别                | 优先级    | 后台可见 |
| ----------------- | ------------------- | ------ | ---- |
| 凭证距到期 30 天        | `CREDENTIAL_EXPIRY` | normal | ✅    |
| 凭证距到期 7 天         | `CREDENTIAL_EXPIRY` | high   | ✅    |
| 凭证距到期 1 天         | `CREDENTIAL_EXPIRY` | urgent | ✅    |
| 凭证被发行机构撤销         | `CREDENTIAL_REVOKED`| urgent | ✅    |
| 第三方请求身份验证（DIDComm）| `VERIFICATION_REQUEST`| high | ✅    |
| 新凭证可领取            | `CREDENTIAL_ISSUED` | normal | ✅    |
| 云备份超 30 天未同步      | `BACKUP_REMINDER`   | low    | ✅    |
| 系统公告              | `SYSTEM`            | low    | ✅    |

#### 后端定时任务（Cron）

```
每天 09:00 UTC — 扫描所有用户凭证，触发到期预警推送
每小时          — 检查 CREDENTIAL_REVOKED 事件队列
实时             — DIDComm 验证请求（WebSocket 转推送）
每周一 08:00    — 云备份超期提醒
```

#### 后端推送接口

**POST /api/push/send**（内部服务调用）
```json
{
  "userDID": "did:key:z6Mk...",
  "notification": {
    "title": "凭证即将到期",
    "body": "您的欧盟驾照将在 5 天后到期。",
    "category": "CREDENTIAL_EXPIRY",
    "data": {
      "action": "OPEN_RENEWAL",
      "credentialId": "urn:uuid:abc-123"
    }
  },
  "priority": "high"
}
```

后端查询 `device_tokens` 表，调用 Expo Push API 批量发送（最多 100 个令牌/次）：

```javascript
// 后端推送发送示例（Node.js）
const { Expo } = require('expo-server-sdk');
const expo = new Expo();

const messages = tokens.map(token => ({
  to: token.expoPushToken,
  sound: 'default',
  title: notification.title,
  body: notification.body,
  data: notification.data,
  priority: notification.priority,
  channelId: 'credentials',  // Android 渠道
  badge: 1,                  // iOS 角标
}));

const chunks = expo.chunkPushNotifications(messages);
for (const chunk of chunks) {
  await expo.sendPushNotificationsAsync(chunk);
}
```

### 17.6 Zustand notificationStore

```typescript
// store/notificationStore.ts
interface NotificationState {
  pushToken: string | null;
  notifications: PushNotificationRecord[];
  unreadCount: number;

  // Actions
  setPushToken: (token: string) => void;
  addNotification: (record: PushNotificationRecord) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;

  // 持久化
  hydrate: () => Promise<void>;
}
```

### 17.7 App 启动时的冷启动通知处理

```typescript
// app/_layout.tsx 或 RootNavigator.tsx
useEffect(() => {
  // 获取 App 关闭状态下用户点击通知触发的启动
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) {
      const data = response.notification.request.content.data;
      // 延迟导航（等待导航器挂载）
      setTimeout(() => handleNotificationDeepLink(data, navigation), 500);
    }
  });
}, []);
```

### 17.8 权限请求时机

推送权限在 Onboarding **Step 7: SUCCESS** 完成后异步请求（不阻塞用户流程）：

```
进入主界面后首次渲染 WalletHomeScreen
       │
       ▼
usePushNotifications() Hook 检查权限状态
       │
       ├─ 已授权：静默更新令牌（如令牌过期）
       │
       └─ 未授权：延迟 3 秒后显示 Modal
                  说明推送通知的用途与益处
                  用户同意 → requestPermissionsAsync()
                  用户拒绝 → 记录 neverAskAgain，不再打扰
```

### 17.9 建构配置更新

```bash
# Android：需配置 FCM
# 1. 从 Firebase Console 下载 google-services.json
# 2. 放置于项目根目录
# 3. app.config.ts 中指定路径

# iOS：APNs 需要签名配置
# 1. 在 Apple Developer 门户创建 Push Notification Key（.p8 文件）
# 2. 在后端推送服务中配置 APNs 认证密钥
# 3. 本地开发使用 development APNs 环境

# 重新构建原生层
npx expo prebuild --clean
npx expo run:ios    # 或 npx expo run:android
```

---

## 附录 A：CredentialCard 渐变色完整映射表

```typescript
export const GRADIENT_MAP: Record<string, [string, string, string?]> = {
  // start color, end color, [optional middle color]
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
```

---

## 附录 B：从 Web 到 RN 的关键差异


| Web 版实现                               | RN 版实现                                               |
| ------------------------------------- | ---------------------------------------------------- |
| `localStorage`                        | `AsyncStorage` + `SecureStore`                       |
| CSS Tailwind 渐变                       | `expo-linear-gradient`                               |
| CSS `animate-*`                       | `react-native-reanimated`                            |
| `window.addEventListener`             | `AppState` + `TouchableWithoutFeedback`              |
| `navigator.mediaDevices.getUserMedia` | `expo-camera`                                        |
| `HashRouter + Routes`                 | `@react-navigation/native-stack` + `bottom-tabs`     |
| `fixed position`                      | `absolute` + `zIndex` 或 Modal 组件                     |
| `recharts`                            | `react-native-gifted-charts`                         |
| CSS RTL (`rtl:*`)                     | `I18nManager.isRTL` 条件判断                             |
| `scrollIntoView`                      | `FlatList.scrollToIndex()` / `ScrollView.scrollTo()` |
| `localStorage.getItem` at init        | Zustand `hydrate()` + `useEffect`                    |
| Browser Fingerprint API               | `expo-local-authentication`                          |
| `clipboard API`                       | `expo-clipboard`                                     |
| Email sharing                         | `expo-sharing`                                       |


---

*文档结束。如需进一步细化特定模块的交互细节或技术实现方案，可单独补充。*