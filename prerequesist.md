---
# EU Digital Identity Wallet — 项目开发硬性前提条件

> 所有条目均需在开发启动前确认或提前申请，否则会阻塞关键开发节点。

---

## 一、开发者账号

| 账号类型 | 用途 | 备注 |
|---|---|---|
| **Apple Developer Account** ($99/年) | iOS 构建、App Store 分发、APNs 推送证书 | 推送通知必须，无法绕过 |
| **Google Play Developer Account** ($25 一次性) | Android 分发、FCM 推送配置 | 需绑定信用卡 |
| **本地构建（无需 EAS）** | iOS 用 Xcode Archive，Android 用 `./gradlew assembleRelease` | 需本地配置签名证书；无 OTA 热更新，每次更新需重新提交 App Store / Google Play |
| **Google Cloud / Firebase Account** | Gemini API、FCM 推送、数据库 | 需绑定计费账户 |

---

## 二、API & 第三方服务

| 服务 | 用途 | 注意事项 |
|---|---|---|
| **Google Gemini API Key** | AI 功能（已在代码中集成） | 需申请配额，生产环境要确认计费上限 |
| **Firebase Cloud Messaging (FCM)** | Android + iOS 后台推送 | iOS 还需配合 APNs 证书 |
| **Apple Push Notification Service (APNs)** | iOS 后台推送 | 需从 Apple Developer 后台生成 .p8 密钥文件 |
| **DID Registry / 链上注册表**（可选） | 存储/解析 DID Document | 若用公链（如 Ethereum/ION）需要 RPC 节点访问权限和 Gas 费用 |

---

## 三、云基础设施（必须自建或采购）

| 组件 | 说明 | 推荐方案 |
|---|---|---|
| **后端 API 服务器** | 存储用户公钥、DID Document、推送 Token | Node.js / Go，部署于 AWS / GCP / Vercel |
| **数据库** | 用户公钥、DID 映射、推送订阅记录 | PostgreSQL 或 MongoDB |
| **推送通知服务端** | 调用 FCM/APNs 发送后台推送 | 可用 Firebase Admin SDK 或 Expo Push API |
| **密钥托管/加密存储** | 服务端加密存储用户公钥 | 需支持 AES-256 或 KMS（AWS KMS / GCP Cloud KMS） |
| **HTTPS/TLS 证书** | 所有 API 接口必须走 HTTPS | Let's Encrypt 免费，或云服务商托管 |

---

## 四、本地开发环境要求

| 工具 | 最低版本 | 说明 |
|---|---|---|
| Node.js | >= 18 LTS | Expo 依赖 |
| Expo CLI / EAS CLI | 最新版 | `npm i -g eas-cli` |
| Xcode | >= 15（macOS 必须） | iOS 模拟器和真机调试 |
| Android Studio | 最新稳定版 | Android 模拟器和 SDK |
| CocoaPods | >= 1.12 | iOS 原生依赖管理 |
| JDK | >= 17 | Android 构建 |

> **注意**：iOS 开发必须在 macOS 上进行，无法在 Windows/Linux 构建 iOS 包。

---

## 五、技术能力要求

| 领域 | 要求级别 | 说明 |
|---|---|---|
| React Native / Expo | 中级以上 | 理解原生模块、EAS Build 流程 |
| 非对称加密（RSA/ECDSA/Ed25519） | 有基础 | DID 密钥对生成、签名、验证 |
| DID/W3C 标准（DID Core Spec） | 了解即可 | 理解 DID Document 结构 |
| 后端开发（REST API） | 中级 | 公钥存储、推送触发接口 |
| 推送通知集成（FCM + APNs） | 有经验 | 双端后台推送配置较复杂 |
| 移动端安全存储 | 基础 | iOS Keychain / Android Keystore 使用 |

---

## 六、证书与合规（EU 相关）

| 项目 | 说明 |
|---|---|
| **eIDAS 2.0 合规性** | 若面向真实 EU 用户，需了解 EUDIW ARF（Architecture Reference Framework）规范 |
| **GDPR 数据合规** | 用户身份数据涉及个人信息，需隐私政策、数据处理协议 |
| **隐私政策 & 服务条款页面** | App Store / Google Play 上架必须提供 |
| **SSL Pinning**（建议） | 防止中间人攻击，DID 场景下安全要求较高 |

---

## 七、上线前必须完成的申请清单

- [ ] 注册 Apple Developer Account 并生成 APNs .p8 Key
- [ ] 注册 Firebase 项目并获取 `google-services.json`（Android）和 `GoogleService-Info.plist`（iOS）
- [ ] 申请 Google Gemini API Key 并设置用量告警
- [ ] 购买/配置后端服务器与域名（HTTPS）
- [ ] 配置 KMS 或服务端加密方案（用于公钥存储）
- [ ] 准备隐私政策页面 URL（上架必需）

---

## 八、推送方案适用场景总结

| 特性 | Firebase (FCM) | 自建 WebSocket (WS) |
|---|---|---|
| **主要用途** | 系统通知（即使 App 关闭也能收到） | 应用内实时交互（如聊天、实时行情） |
| **送达保障** | 极高，受系统级保护 | 较低，受 App 存活影响 |
| **实现难度** | 简单（集成 SDK 即可） | 高（需处理断线重连、心跳、扩容） |
| **费用** | 基本功能免费 | 需支付服务器和带宽成本 |

> **专家建议**：本项目（DID 钱包）优先使用 FCM/APNs 处理身份验证请求推送，WebSocket 仅在需要实时状态同步时补充使用。

---
几点重点提示：

1. APNs 证书是最容易被遗漏的阻塞点，申请后还需要在 Firebase Console 配置，整个流程至少预留 1-2 天。
2. DID 私钥存储需要调用 iOS Keychain 或 Android Keystore 等原生 API，Expo managed workflow 下需通过 expo-secure-store
或裸露出原生层，提前确认方案。
3. 不使用 EAS 的发布流程：
   - **iOS**：Xcode → Product → Archive → Distribute App → App Store Connect（需 Apple Developer 证书和 Provisioning Profile）
   - **Android**：`cd android && ./gradlew bundleRelease` 生成 `.aab`，再通过 Google Play Console 手动上传
   - **热更新替代方案**：可用 Microsoft CodePush（App Center）或自建 Bundle 下发服务替代 Expo OTA