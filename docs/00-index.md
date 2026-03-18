# EU Digital Identity Wallet — 任务拆分总览

> **项目**: EU Digital Identity Wallet（React Native + Expo）
> **参考**: REQUIREMENTS.md v1.0 + Web 版参考实现 (localhost:3000)
> **拆分原则**: 每个任务为最小可独立实现、可测试的单元

---

## 任务依赖关系图

```
T01 项目配置
  └─→ T02 类型定义
        └─→ T03 常量/Mock数据
              ├─→ T04 authStore
              │     └─→ T07 storageService
              ├─→ T05 walletStore
              └─→ T06 settingsStore
                    └─→ T08 biometricService
                          └─→ T09 geminiService

T10 i18n-EN
  └─→ T11 i18n-其他语言

T12 导航结构
  └─→（依赖 T04 authStore）

T13 PinPad 组件 ←── T17 Onboarding、T18 LockScreen
T14 CredentialCard ←── T19 WalletHome、T21 凭证详情
T15 共享组件
T16 自定义 Hooks

（屏幕层依赖全部基础层完成）
T17 Onboarding
T18 LockScreen
T19 WalletHome
T20 Notifications
T21 CredentialDetail
T22 ScanScreen
T23 ActivityScreen
T24 ServicesScreen
T25 ProfileScreen
T26 IssuanceScreen
T27 RenewalScreen
T28 RevokeScreen

T29 App 根组件与系统集成
```

---

## 任务列表（按实现顺序）

### 阶段 0：项目基础

| 编号 | 任务 | 文件 | 预估复杂度 |
|------|------|------|-----------|
| T01 | 项目依赖安装与 Expo 配置 | `01-project-setup.md` | ⭐⭐ |
| T02 | TypeScript 类型定义 | `02-types-models.md` | ⭐⭐ |
| T03 | 常量、颜色系统与 Mock 数据 | `03-constants-mock-data.md` | ⭐⭐⭐ |

### 阶段 1：状态管理层

| 编号 | 任务 | 文件 | 预估复杂度 |
|------|------|------|-----------|
| T04 | authStore（Zustand） | `04-auth-store.md` | ⭐⭐ |
| T05 | walletStore（Zustand） | `05-wallet-store.md` | ⭐⭐ |
| T06 | settingsStore（Zustand） | `06-settings-store.md` | ⭐ |

### 阶段 2：服务层

| 编号 | 任务 | 文件 | 预估复杂度 |
|------|------|------|-----------|
| T07 | storageService（AsyncStorage 封装） | `07-storage-service.md` | ⭐ |
| T08 | biometricService（生物识别封装） | `08-biometric-service.md` | ⭐⭐ |
| T09 | geminiService（AI 集成） | `09-gemini-service.md` | ⭐⭐ |

### 阶段 3：国际化

| 编号 | 任务 | 文件 | 预估复杂度 |
|------|------|------|-----------|
| T10 | i18n 初始化 + 英文翻译 | `10-i18n-setup.md` | ⭐⭐ |
| T11 | 多语言翻译文件（zh/es/fr/pt/ar） | `11-i18n-translations.md` | ⭐⭐⭐ |

### 阶段 4：导航结构

| 编号 | 任务 | 文件 | 预估复杂度 |
|------|------|------|-----------|
| T12 | 导航类型定义 + TabNavigator + RootNavigator | `12-navigation.md` | ⭐⭐⭐ |

### 阶段 5：基础组件

| 编号 | 任务 | 文件 | 预估复杂度 |
|------|------|------|-----------|
| T13 | PinPad 数字键盘组件 | `13-pinpad-component.md` | ⭐⭐⭐ |
| T14 | CredentialCard 凭证卡片组件 | `14-credential-card.md` | ⭐⭐⭐ |
| T15 | 共享 UI 组件集合 | `15-shared-components.md` | ⭐⭐⭐ |
| T16 | 自定义 Hooks | `16-hooks.md` | ⭐⭐ |

### 阶段 6：屏幕实现

| 编号 | 任务 | 文件 | 预估复杂度 |
|------|------|------|-----------|
| T17 | OnboardingScreen（7步引导流程） | `17-onboarding-screen.md` | ⭐⭐⭐⭐⭐ |
| T18 | LockScreen（锁屏） | `18-lock-screen.md` | ⭐⭐⭐ |
| T19 | WalletHomeScreen（钱包主页） | `19-wallet-home.md` | ⭐⭐⭐⭐ |
| T20 | NotificationsScreen（通知列表） | `20-notifications-screen.md` | ⭐⭐ |
| T21 | CredentialDetailScreen（凭证详情） | `21-credential-detail.md` | ⭐⭐⭐⭐ |
| T22 | ScanScreen（QR 扫描） | `22-scan-screen.md` | ⭐⭐⭐⭐ |
| T23 | ActivityScreen（活动日志） | `23-activity-screen.md` | ⭐⭐⭐ |
| T24 | ServicesScreen（服务市场） | `24-services-screen.md` | ⭐⭐⭐ |
| T25 | ProfileScreen（个人资料 + 5个 Modal） | `25-profile-screen.md` | ⭐⭐⭐⭐⭐ |
| T26 | IssuanceScreen（添加新凭证） | `26-issuance-screen.md` | ⭐⭐⭐ |
| T27 | RenewalScreen（凭证续期） | `27-renewal-screen.md` | ⭐⭐ |
| T28 | RevokeConfirmationScreen（撤销确认） | `28-revoke-screen.md` | ⭐⭐ |

### 阶段 7：系统集成

| 编号 | 任务 | 文件 | 预估复杂度 |
|------|------|------|-----------|
| T29 | App 根组件、主题系统与 RTL 集成 | `29-app-root.md` | ⭐⭐⭐ |

---

## 实现优先顺序建议

```
第1轮（地基）:  T01 → T02 → T03
第2轮（数据层）: T04 → T05 → T06 → T07 → T08 → T09
第3轮（基础设施）: T10 → T11 → T12 → T16
第4轮（组件库）: T13 → T14 → T15
第5轮（屏幕-核心）: T18 → T17 → T19
第6轮（屏幕-功能）: T20 → T21 → T22 → T23
第7轮（屏幕-辅助）: T24 → T25 → T26 → T27 → T28
第8轮（收尾）: T09 → T29
```

---

*文档生成于 2026-03-18，基于 REQUIREMENTS.md v1.0*
