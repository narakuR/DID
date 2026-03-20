# 原生适配维护策略

> 目标：当项目已经适配好一部分 iOS / Android 原生能力后，后续继续迭代 React Native 业务代码、重新生成原生工程、重新打包发布时，尽量避免原生适配丢失、冲突或重复维护。

---

## 1. 先说结论

在 React Native / Expo Development Build 项目里，真正需要长期坚持的原则只有一条：

**业务逻辑只维护一份，原生层只维护“能力适配”，并且尽量把原生改动固化到可重复生成的来源里。**

换句话说：

- 不要维护三套业务代码
- 不要让 iOS / Android 各自长出一套业务判断
- 不要把关键原生改动只留在 `ios/`、`android/` 目录里而没有“上游配置来源”

如果做对了，后续大多数迭代仍然只改 RN / TS 代码。

---

## 2. 哪些内容应该只写在 RN 层

以下内容应当尽量只在 React Native / TypeScript 层维护：

- 数据模型定义
- store 状态管理
- 业务流程
- 页面 UI
- 路由规则
- 消息协议解析
- DID 文档生成规则
- 通知列表入库逻辑
- WebSocket 前台消息处理
- 深链解析后的业务跳转规则

这些内容的特点是：

- 与平台无关
- 属于业务真相
- 不应该在 iOS 和 Android 各写一份

如果同一条业务规则同时出现在：

- RN
- iOS
- Android

那就意味着架构已经开始失控。

---

## 3. 哪些内容属于原生适配层

原生层只负责“系统能力接入”，不负责业务判断。

典型包括：

- APNs / FCM token 获取
- 推送后台回调
- iOS Capability / Entitlements
- Android Manifest / Service / Receiver
- Keychain / Keystore 更底层能力
- 第三方原生 SDK 初始化
- 后台任务、前台服务、系统通知扩展

原生层应该做的事情：

- 获取平台能力
- 接系统回调
- 把原始事件交回 RN

原生层不应该做的事情：

- 决定消息是否入业务列表
- 决定 DID 数据怎么组织
- 决定页面怎么跳
- 决定用户流程怎么变化

---

## 4. 最常见的问题：为什么原生改动会丢

因为很多团队会直接手改：

- `ios/`
- `android/`

但没有把这些改动写回“上游来源”。

例如：

- 只在 `android/build.gradle` 手动加插件
- 只在 Xcode 里手动打开 capability
- 只在 `AndroidManifest.xml` 里加配置

这类改动当前能跑，但一旦发生下面的情况，就可能丢：

- `expo prebuild --clean`
- 删除 `ios/` 或 `android/` 重新生成
- 升级 Expo SDK 后重新预构建
- 新同事在另一台机器重新拉起原生工程

因此必须区分：

### 4.1 安全改动

这类改动通常不会轻易丢，因为它们有明确来源：

- `app.config.ts`
- Expo config plugin
- 固定放置的原生配置文件
- `package.json` 依赖

例如：

- 权限配置
- 插件声明
- `google-services.json`
- `GoogleService-Info.plist`

### 4.2 高风险改动

这类改动最容易在重建原生工程时丢：

- 手动修改 `android/build.gradle`
- 手动修改 `android/app/build.gradle`
- 手动修改 `Info.plist`
- 手动修改 Xcode capability 但没有对应插件或文档
- 手动改 Podfile、Gradle 而没有沉淀成可重放机制

---

## 5. 正确的长期维护方式

为了让“已经适配好的 iOS 能力”在以后重新生成打包文件时仍然保留，推荐采用下面这套顺序。

### 5.1 第一优先级：写回 `app.config.ts`

只要 Expo 能识别的原生配置，都优先写回 `app.config.ts`。

例如：

- 权限
- bundle id / package name
- URL scheme
- 通知权限
- 插件声明
- 构建版本配置
- Firebase 配置文件路径

原因：

- `app.config.ts` 是可重复生成的源头
- 后续重建原生工程时，配置可再次落地

### 5.2 第二优先级：写成 config plugin

如果某项原生改动不能只靠 `app.config.ts` 表达，但逻辑是稳定的，就应该写成 config plugin。

适合 plugin 化的改动包括：

- 修改 `Info.plist`
- 修改 `AndroidManifest.xml`
- 修改 `build.gradle`
- 注入某个 capability 配置
- 添加某个原生依赖声明

例如：

- Android `google-services` 插件接入
- iOS 某个必要 entitlement
- 某个 SDK 必需的 plist / manifest 字段

config plugin 的价值是：

- 可重复
- 可版本管理
- 不怕重建原生工程
- 不依赖人工记忆

### 5.3 第三优先级：保留原生文件，但把改动文档化

如果某项能力确实必须手工在 Xcode / Android Studio 中做，且暂时无法 plugin 化，那么至少要做到：

- 把改动点写进项目文档
- 标出文件路径
- 标出原因
- 标出重建原生工程后必须复核的步骤

例如记录：

- 哪个 target 需要打开 Push Notifications
- 哪个 Background Mode 需要勾选
- 哪个 Gradle 文件必须包含什么插件

这样后续即使重建，也不会靠口头记忆。

---

## 6. 如何避免“已适配的原生能力”与新 RN 业务冲突

核心原则有三条。

### 6.1 原生层接口要稳定

原生层提供给 RN 的能力必须收敛成稳定接口。

例如：

```ts
registerPushToken(): Promise<string | null>
getBiometricAvailability(): Promise<boolean>
signWithNativeKey(payload: Uint8Array): Promise<string>
```

不要让 RN 业务直接依赖：

- 某个 iOS 类名
- 某个 Android Service 细节
- 某个平台的生命周期实现差异

RN 只依赖接口，不依赖实现。

### 6.2 原生层尽量无业务状态

原生层只负责：

- 触发事件
- 回调能力
- 返回结果

真正的状态统一放在 RN store 中。

例如推送场景：

1. 原生获取 token
2. 原生把 token 传回 RN
3. RN 存入 store
4. RN 决定页面怎么展示

不要让 iOS 自己维护一份通知列表，Android 再维护一份通知列表，RN 又维护一份通知列表。

### 6.3 业务版本升级只改 RN，原生能力层只在必要时改

当你新增业务需求时，优先先问：

- 这是业务规则变化？
- 还是系统能力变化？

如果只是业务规则变化：

- 只改 RN

如果是系统能力变化：

- 才需要评估原生适配层是否一起调整

这样能避免每次需求都碰 iOS / Android。

---

## 7. 什么时候必须直接维护 `ios/` 或 `android/` 代码

以下场景通常无法只靠 RN 或配置解决：

### 7.1 后台长期运行能力

例如：

- Android 前台服务
- 后台长连接保活
- 开机自启
- WorkManager
- iOS 后台任务

### 7.2 推送高级能力

例如：

- iOS Notification Service Extension
- Android 自定义后台消息处理
- 冷启动通知路由桥接

### 7.3 深层安全能力

例如：

- Android Keystore 硬件级策略
- iOS Keychain 更深层封装
- 私钥不可导出控制

### 7.4 自定义原生模块

例如：

- RN 没有封装好的第三方 SDK
- NFC / 蓝牙 / UWB 深度接入
- 厂商通道推送

这类代码本来就应该作为“正式原生代码”长期存在，不是临时补丁。

---

## 8. 如何做到后续重新生成原生工程时不丢能力

这是最关键的落地策略。

建议把每一项原生能力按下面四类管理：

### A 类：纯 RN 业务

放在：

- `src/`

不依赖原生目录。

### B 类：Expo 配置

放在：

- `app.config.ts`

例如：

- 权限
- 插件
- bundle id / package
- Firebase 配置文件路径

### C 类：可重放的原生改动

放在：

- 本地 config plugin
- 或脚本化修改逻辑

这样删掉 `ios/` / `android/` 重建也能恢复。

### D 类：必须人工维护的原生能力

放在：

- `ios/`
- `android/`

并配套：

- 文档
- 接口定义
- 手工检查清单

只有 D 类才是真正需要长期维护原生代码的部分。

---

## 9. 推荐的项目组织方式

建议按下面的思路组织：

### RN 业务层

- `src/store/`
- `src/services/`
- `src/screens/`
- `src/types/`

### RN 对原生的桥接封装

- `src/native/`

例如：

- `src/native/pushBridge.ts`
- `src/native/biometricBridge.ts`
- `src/native/secureKeyBridge.ts`

这里不要写业务，只写原生调用封装。

### 原生实现层

- `ios/`
- `android/`

只实现系统能力，不直接承载业务规则。

### 配置固化层

- `app.config.ts`
- `plugins/`（本地 config plugins）

---

## 10. 发布新版本时的正确心智模型

发布新版本时，不应该认为自己在维护：

- 一套 RN
- 一套 iOS
- 一套 Android

而应该认为自己在维护：

### 一套业务系统

写在 RN / TS 里。

### 两个系统能力适配层

- iOS
- Android

它们只是能力入口，不是业务主体。

所以大多数版本迭代时：

- 只改 RN 业务代码

只有当系统能力变更时，才改：

- 原生适配层

---

## 11. 当前项目的具体建议

结合当前 DID 项目，建议你这样做：

### 已经适配好的内容

优先沉淀到：

- `app.config.ts`
- 本地 config plugin
- 固定原生配置文件

例如：

- Firebase 配置文件路径
- 通知权限
- 本地通知插件
- Android / iOS 的静态配置

### 当前仍有风险的部分

如果某些改动仍然只是手改：

- `android/build.gradle`
- `android/app/build.gradle`

那么后续最好继续治理成 plugin 化，不要长期靠手工 patch。

### 当前不需要拆到原生业务层的部分

这些继续由 RN 管：

- DID 业务流程
- Push 记录入库
- 通知列表
- UI 展示
- WebSocket 前台逻辑

---

## 12. 一份可执行的检查清单

每次接入一个新的原生能力时，都按这张清单判断：

### 第一步：这是不是业务逻辑？

如果是：

- 只写 RN

### 第二步：这是不是静态原生配置？

如果是：

- 优先写 `app.config.ts`
- 不够再写 config plugin

### 第三步：这是不是运行时系统能力？

如果是：

- 原生适配层实现
- RN 定义接口 contract
- 状态回流 RN store

### 第四步：这项能力是否会在重建原生工程后丢失？

如果会：

- 必须补“上游来源”
- 配置化 / plugin 化 / 文档化至少三选一

---

## 13. 最终原则

为了保证后续重新生成 iOS / Android 打包文件时：

- 不丢已适配能力
- 不和新 RN 业务冲突
- 不变成三套业务代码

请始终坚持下面这三条：

1. **业务只在 RN 维护**
2. **原生只做能力适配**
3. **原生改动必须有可重放来源**

只要这三条成立，后续无论是重新预构建、重新打包、还是升级 SDK，你都可以在较低成本下保留原有原生能力。