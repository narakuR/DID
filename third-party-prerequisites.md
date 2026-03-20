# 账号与第三方前置条件清单

本文档总结当前项目在开发、调试、打包、推送、生物识别、DID 安全存储等环节中，已经涉及或后续高概率会涉及的账号、平台、配置文件和设备前置条件。

适用范围：
- 当前 Expo / React Native 项目
- 本地构建，不依赖 Expo 云构建或 Expo Push 服务
- 推送走原生 `FCM / APNs`
- 敏感数据目前走 `SecureStore`

---

## 1. 当前项目实际依赖的第三方平台

### 1.1 Apple 生态
- Apple Developer Program
- Xcode
- iOS 真机
- APNs（Apple Push Notification service）

### 1.2 Google / Firebase 生态
- Firebase 项目
- Firebase Cloud Messaging（FCM）
- Android Google Play Services
- `google-services.json`
- `GoogleService-Info.plist`

### 1.3 Expo SDK 级依赖
- `expo-notifications`
- `expo-secure-store`
- `expo-local-authentication`
- `expo-sharing`
- `expo-device`

说明：
- 这些是 SDK / 本地模块依赖，不等于依赖 Expo 云服务。
- 当前项目已经移除了 Expo Push Token 路线，只保留原生 token。

---

## 2. 必须准备的账号

### 2.1 Apple Developer 账号

用途：
- iOS 真机签名
- iOS 正式包构建
- App Store Connect 分发
- APNs 推送能力
- Push Notifications capability

当前项目何时必须有：
- 只要要在 iPhone 真机上做正式推送验证，就必须有
- 只要要做 iOS 发布，就必须有

没有时的影响：
- 无法完整启用 iOS Push
- 无法获取稳定可用的 APNs 链路
- 无法进行正式签名发布

### 2.2 Firebase / Google 账号

用途：
- 创建 Firebase 项目
- 配置 Android / iOS App
- 使用 FCM 推送
- 管理 Messaging Console

当前项目何时必须有：
- 只要要验证 Android FCM 推送，就必须有
- 只要要用 Firebase Console 发测试消息，就必须有

没有时的影响：
- 不能使用 Firebase Console
- 不能完成 Android 原生推送链路

---

## 3. 平台级配置文件

### 3.1 Android：`google-services.json`

当前项目位置：
- 根目录：[google-services.json](/Users/naraku/Desktop/DID/google-services.json)
- 原生工程生效位置：[android/app/google-services.json](/Users/naraku/Desktop/DID/android/app/google-services.json)

作用：
- 绑定 Android App 与 Firebase 项目
- 支撑 FCM 初始化

必须满足：
- 包名必须与项目一致
- 当前项目包名为 `com.did.wallet`

如果不满足：
- Android 构建时 `processDebugGoogleServices` 会失败
- 或 Firebase 初始化失败
- 或拿不到 `devicePushToken`

### 3.2 iOS：`GoogleService-Info.plist`

当前项目位置：
- [GoogleService-Info.plist](/Users/naraku/Desktop/DID/GoogleService-Info.plist)

作用：
- 绑定 iOS App 与 Firebase 项目

必须满足：
- Bundle Identifier 必须与项目一致
- 当前项目 iOS Bundle ID 为 `com.did.wallet`

如果不满足：
- iOS Firebase 初始化异常
- FCM / Analytics / 相关 SDK 行为不稳定

---

## 4. iOS 推送前置条件

### 4.1 APNs 是 iOS 远程推送的硬前提

如果你要的是：
- Firebase Console 远程推送
- App 在后台或关闭时收到通知
- iOS 原生通知中心展示消息

那么必须依赖：
- APNs

这不是 Firebase 能替代掉的。

### 4.2 iOS 侧必须具备的条件

- Apple Developer 付费账号
- 正确的 App ID / Bundle ID
- Push Notifications capability
- 必要时 `Background Modes -> Remote notifications`
- Firebase 项目中配置 APNs Key 或证书

### 4.3 没有 APNs 时的现实结果

- iOS 无法完成原生远程推送
- Firebase Console 发消息也无法真正投递到 iPhone
- 只能做本地通知或前台应用内逻辑验证

### 4.4 iOS 模拟器限制

- iOS 模拟器不能作为远程推送的可靠验证环境
- iOS 远程推送应使用真机验证

---

## 5. Android 推送前置条件

### 5.1 Android 原生推送依赖 FCM

当前项目已经改为：
- 只使用原生 `devicePushToken`
- 不再使用 Expo Push Token

### 5.2 Android 侧必须具备的条件

- Firebase 项目已创建 Android App
- `google-services.json` 对应当前包名 `com.did.wallet`
- Android 构建已接入 Google Services Gradle 插件
- 设备具备 Google Play Services

### 5.3 Android 真机 / 模拟器差异

Android 真机：
- 最可靠
- 最适合验证 FCM

Android 模拟器：
- 可行，但环境要求更高
- 需要 `Google Play` 镜像
- 常常需要可用的 Google 服务环境
- 代理、Play Store、Play Services 状态都会影响 token 获取

### 5.4 没有 Google Play Services 时

常见于：
- 部分国内 Android 设备
- 无 Google 框架环境
- 被裁剪的系统镜像

影响：
- 无法正常使用 FCM
- 即使 App 本身能运行，也可能拿不到 `devicePushToken`

---

## 6. 本地开发与打包环境前置条件

### 6.1 iOS

需要：
- macOS
- Xcode
- CocoaPods
- Apple 签名环境

适用场景：
- 本地运行 iOS
- 真机构建
- Archive 打包

### 6.2 Android

需要：
- Android Studio
- Android SDK
- 对应 SDK Platform
- Gradle 可用环境

当前项目注意项：
- Android `compileSdkVersion` / `targetSdkVersion` 已提升到 `36`
- 本机需要具备 Android 36 相关 SDK 组件

---

## 7. 生物识别前置条件

当前项目依赖：
- `expo-local-authentication`

要正常验证生物识别，需要：

iOS：
- 真机已录入 Face ID / Touch ID
- 或在模拟器里正确模拟生物识别

Android：
- 设备支持生物识别
- 已设置锁屏方式
- 已录入指纹
- 模拟器需要先在系统里完成指纹录入，而不是只点 `Touch Sensor`

没有这些条件时：
- 生物识别接口会返回不可用
- 无法完整验证 DID 私钥访问控制体验

---

## 8. DID 与安全存储相关前置条件

当前项目现状：
- DID 私钥目前保存于 `SecureStore`
- 并开启 `requireAuthentication`

这要求设备具备：
- 可用的系统安全存储
- 可用的生物识别或设备解锁机制

注意：
- `SecureStore` 适合当前演示和通用安全存储
- 如果未来升级到“不可导出私钥 + 原生签名”，则会新增更强的原生依赖：
  - iOS Keychain / Secure Enclave
  - Android Keystore

那时的新增前置条件通常会包括：
- 更细粒度的系统安全能力适配
- 原生桥接模块
- 更严格的真机测试

---

## 9. 当前项目已确认的关键标识

- iOS Bundle Identifier: `com.did.wallet`
- Android package: `com.did.wallet`

对应配置位置：
- [app.config.ts](/Users/naraku/Desktop/DID/app.config.ts)

相关 Firebase 文件中也必须保持一致：
- [google-services.json](/Users/naraku/Desktop/DID/google-services.json)
- [GoogleService-Info.plist](/Users/naraku/Desktop/DID/GoogleService-Info.plist)

---

## 10. 当前项目最常见的阻塞点

### 10.1 iOS 远程推送拿不到 token
常见原因：
- 没有 APNs
- 没有 Apple Developer 付费账号
- Push capability 未启用
- Firebase 未配置 APNs Key

### 10.2 Android 拿不到 `devicePushToken`
常见原因：
- `google-services.json` 不匹配
- Google Services Gradle 插件未生效
- 设备没有 Google Play Services
- 模拟器网络 / 代理 / Play Store 环境异常

### 10.3 生物识别不可用
常见原因：
- 没有设置系统锁屏
- 没有录入指纹 / Face ID
- 模拟器只是开启了 sensor，没有完成 enrollment

---

## 11. 建议的最小准备清单

如果你要稳定推进当前项目，建议至少准备好这些：

### 必备
- Apple Developer 账号
- Firebase 项目
- 正确的 `google-services.json`
- 正确的 `GoogleService-Info.plist`
- Xcode
- Android Studio
- iPhone 真机
- Android 真机或带 Google Play 的模拟器

### 建议
- 可访问 Google 服务的网络环境
- 稳定的代理方案
- 明确记录 Bundle ID / package / Firebase App 对应关系

---

## 12. 当前项目的现实结论

就目前系统而言：

- 账号层面，最关键的是 `Apple Developer` 和 `Firebase`
- 配置文件层面，最关键的是 `google-services.json` 与 `GoogleService-Info.plist`
- 设备层面，最关键的是：
  - iOS 真机用于 APNs / 推送验证
  - Android 具备 Google Play Services 的设备用于 FCM 验证
- 安全能力层面，当前 `SecureStore` 已可支撑现阶段需求，但如果将来提升到“不可导出私钥签名”，会引入更强的原生依赖

如果后续继续扩展原生能力，建议把新增前置条件继续补进本文件，而不是散落在聊天记录或临时说明里。
