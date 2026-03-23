> ⚠️ **已废弃**：本文档规划的原生 Swift/Kotlin Bridge 方案已被纯 JS 可插拔架构取代。
> 新方案使用 `oid4vc-ts` + `@noble/curves`，详见 `src/plugins/` 目录。

# EUDI Wallet Core 集成设计稿

本文档给出一个面向当前项目的、可执行的 EUDI Wallet Core 集成设计。

目标：
- 用 `eudi-lib-ios-wallet-kit` 和 `eudi-lib-android-wallet-core` 替代当前自实现 `didService` 中的“钱包核心能力”
- 通过 React Native bridge 统一暴露给 RN 业务层
- 允许当前项目分阶段迁移，而不是一次性推翻现有 DID 流程

本文档覆盖：
- 当前项目第一阶段应使用 EUDI 的哪些能力
- `EudiWalletBridge` TypeScript 接口
- iOS Swift bridge 骨架
- Android Kotlin bridge 骨架
- 第一阶段要修改的当前项目文件列表

---

## 1. 当前项目第一阶段要从 EUDI 用到哪些能力

第一阶段不建议直接追求“完整 EU Wallet”，而是只替换当前项目里最接近钱包核心的那部分能力。

### 1.1 第一阶段纳入 EUDI 的能力

建议纳入：
- Wallet Core 初始化
- 文档/凭证容器初始化
- 本地文档加载与列表读取
- 基于 `OpenID4VCI` 的签发入口
- 基于 redirect URI 的授权恢复入口
- 文档删除能力
- 钱包状态与错误透传

### 1.2 第一阶段暂不强行迁入 EUDI 的能力

建议保留现状或延后：
- 当前 `did:key + Ed25519 + DID Document 导出`
- 任意 payload 的通用签名接口
- 现有“把公钥文档导出成 JSON 文件”的展示逻辑
- 以 DID 为中心的 Profile 展示文案

原因：
- 当前 [didService.ts](/Users/naraku/Desktop/DID/src/services/didService.ts) 是一个通用 `did:key` 服务
- EUDI 更偏“文档钱包核心”，不是 `did:key` 的 1:1 替代
- 如果第一阶段直接强替换，会把迁移复杂度拉高，并混淆“DID 兼容层”和“文档钱包核心层”

### 1.3 第一阶段目标状态

第一阶段完成后，项目将并存两层：

1. `walletCoreService`
- 面向 EUDI
- 管理文档、签发、恢复授权、读取文档列表

2. `didService`
- 暂时保留
- 仅承担当前兼容的 `did:key` 展示和旧流程支撑

等 EUDI 侧流程稳定后，再决定是否彻底移除 `didService`

---

## 2. 分层设计

整体分三层：

### 2.1 RN 业务层
- 页面
- store
- onboarding / profile / notifications / issuance 流程编排
- UI 展示与导航

### 2.2 RN bridge facade 层
- `src/native/bridges/EudiWalletBridge.ts`
- `src/native/eudiWalletBridge.ts`
- `src/services/walletCoreService.ts`

这一层负责：
- 为 RN 暴露统一 API
- 屏蔽 iOS / Android 原生差异
- 做参数与返回值归一化

### 2.3 原生实现层

iOS：
- Swift bridge
- 对接 `eudi-lib-ios-wallet-kit`

Android：
- Kotlin bridge
- 对接 `eudi-lib-android-wallet-core`

原生层只负责：
- 初始化 EUDI Core
- 调用原生 SDK
- 将结果转成 bridge contract

原生层不负责：
- 页面业务逻辑
- 导航
- 通知列表入库
- DID Metadata 的 RN 状态管理

---

## 3. 第一阶段桥接能力边界

### 3.1 第一阶段 bridge 要解决的问题

- App 启动时初始化 wallet core
- 用户 onboarding 完成后，保证 wallet core 可用
- 能读取本地已有文档列表
- 能通过 issuance offer 触发签发
- 能在授权/跳转回来后恢复流程
- 能删除某个本地文档

### 3.2 第一阶段 bridge 不解决的问题

- 完整 Wallet UI
- 任意 DID method 抽象
- 自定义 Crypto provider 替换
- 复杂远程呈现的所有状态管理
- 与现有通知流的深度打通

---

## 4. TypeScript bridge contract

建议新增文件：
- [src/native/bridges/EudiWalletBridge.ts](/Users/naraku/Desktop/DID/src/native/bridges/EudiWalletBridge.ts)

```ts
export type EudiWalletDocumentFormat = 'mso_mdoc' | 'sd_jwt_vc' | 'unknown';

export type EudiWalletDocumentStatus =
  | 'issued'
  | 'pending'
  | 'deferred'
  | 'revoked'
  | 'expired'
  | 'unknown';

export type EudiWalletDocument = {
  id: string;
  docType: string;
  format: EudiWalletDocumentFormat;
  displayName?: string;
  issuerName?: string;
  issuedAt?: string;
  status: EudiWalletDocumentStatus;
};

export type EudiWalletInitializeParams = {
  serviceName: string;
  userAuthenticationRequired?: boolean;
  openId4VciRedirectUri?: string;
  openId4VpRedirectUri?: string;
  trustedReaderCertificates?: string[];
};

export type EudiIssueByOfferParams = {
  offerUri: string;
};

export type EudiIssueByDocTypeParams = {
  issuerIdentifier: string;
  format: EudiWalletDocumentFormat;
  docType?: string;
  vct?: string;
};

export type EudiWalletAvailability = {
  initialized: boolean;
  platform: 'ios' | 'android';
  sdkVersion?: string;
};

export type EudiWalletBridgeError = {
  code: string;
  message: string;
  details?: string;
};

export interface EudiWalletBridge {
  initialize(params: EudiWalletInitializeParams): Promise<EudiWalletAvailability>;
  getAvailability(): Promise<EudiWalletAvailability>;
  loadDocuments(): Promise<EudiWalletDocument[]>;
  issueDocumentByOffer(params: EudiIssueByOfferParams): Promise<EudiWalletDocument[]>;
  issueDocumentByDocType(params: EudiIssueByDocTypeParams): Promise<EudiWalletDocument>;
  resumePendingAuthorization(url: string): Promise<void>;
  deleteDocument(documentId: string): Promise<void>;
  resetWallet(): Promise<void>;
}
```

### 4.1 contract 设计原则

- 接口稳定
- 返回值是 RN 友好的 plain object
- 不把原生 SDK 的复杂类型直接暴露给 JS
- 不让 RN 直接感知 iOS/Android 的 manager 类型差异

---

## 5. RN facade 设计

建议新增：
- [src/native/eudiWalletBridge.ts](/Users/naraku/Desktop/DID/src/native/eudiWalletBridge.ts)
- [src/services/walletCoreService.ts](/Users/naraku/Desktop/DID/src/services/walletCoreService.ts)

### 5.1 `src/native/eudiWalletBridge.ts`

负责：
- 从 `NativeModules` 取出 `EudiWalletBridge`
- 做基础类型校验
- 将原生错误统一转为 JS Error

示例：

```ts
import { NativeModules, Platform } from 'react-native';
import type {
  EudiWalletBridge as EudiWalletBridgeContract,
  EudiWalletAvailability,
  EudiWalletDocument,
  EudiWalletInitializeParams,
  EudiIssueByDocTypeParams,
  EudiIssueByOfferParams,
} from './bridges/EudiWalletBridge';

type NativeBridge = EudiWalletBridgeContract;

const nativeBridge = NativeModules.EudiWalletBridge as NativeBridge | undefined;

function ensureBridge(): NativeBridge {
  if (!nativeBridge) {
    throw new Error(`EudiWalletBridge is not linked on ${Platform.OS}.`);
  }
  return nativeBridge;
}

export const eudiWalletBridge = {
  initialize(params: EudiWalletInitializeParams): Promise<EudiWalletAvailability> {
    return ensureBridge().initialize(params);
  },
  getAvailability(): Promise<EudiWalletAvailability> {
    return ensureBridge().getAvailability();
  },
  loadDocuments(): Promise<EudiWalletDocument[]> {
    return ensureBridge().loadDocuments();
  },
  issueDocumentByOffer(params: EudiIssueByOfferParams): Promise<EudiWalletDocument[]> {
    return ensureBridge().issueDocumentByOffer(params);
  },
  issueDocumentByDocType(params: EudiIssueByDocTypeParams): Promise<EudiWalletDocument> {
    return ensureBridge().issueDocumentByDocType(params);
  },
  resumePendingAuthorization(url: string): Promise<void> {
    return ensureBridge().resumePendingAuthorization(url);
  },
  deleteDocument(documentId: string): Promise<void> {
    return ensureBridge().deleteDocument(documentId);
  },
  resetWallet(): Promise<void> {
    return ensureBridge().resetWallet();
  },
};
```

### 5.2 `src/services/walletCoreService.ts`

负责：
- 给页面和 store 提供业务语义更强的服务
- 决定初始化时机
- 与当前 storage / onboarding 流程协作

建议接口：

```ts
class WalletCoreService {
  async ensureInitialized(): Promise<void> {}
  async getDocuments(): Promise<EudiWalletDocument[]> {}
  async issueFromOffer(offerUri: string): Promise<EudiWalletDocument[]> {}
  async resumeFromRedirect(url: string): Promise<void> {}
  async deleteDocument(id: string): Promise<void> {}
}
```

---

## 6. iOS Swift bridge 骨架

建议目录：
- `ios/DID/Features/EudiWallet/EudiWalletBridge.swift`
- `ios/DID/Features/EudiWallet/EudiWalletMapper.swift`
- `ios/DID/Features/EudiWallet/EudiWalletCoordinatorHolder.swift`

### 6.1 角色分工

`EudiWalletBridge.swift`
- 暴露给 RN
- 收 JS 参数
- 调 coordinator
- resolve / reject Promise

`EudiWalletCoordinatorHolder.swift`
- 持有 EUDI wallet coordinator / manager
- 避免多次初始化导致状态丢失

`EudiWalletMapper.swift`
- 将 EUDI SDK 类型映射成 JS dictionary

### 6.2 Swift bridge 骨架

```swift
import Foundation
import React
import UIKit
// import EudiWalletKit

@objc(EudiWalletBridge)
final class EudiWalletBridge: NSObject {
  private let holder = EudiWalletCoordinatorHolder.shared

  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(initialize:resolver:rejecter:)
  func initialize(
    params: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      let serviceName = params["serviceName"] as? String ?? "DID Wallet"
      let userAuthenticationRequired = params["userAuthenticationRequired"] as? Bool ?? true
      let openId4VciRedirectUri = params["openId4VciRedirectUri"] as? String
      let openId4VpRedirectUri = params["openId4VpRedirectUri"] as? String

      try holder.initializeIfNeeded(
        serviceName: serviceName,
        userAuthenticationRequired: userAuthenticationRequired,
        openId4VciRedirectUri: openId4VciRedirectUri,
        openId4VpRedirectUri: openId4VpRedirectUri
      )

      resolve([
        "initialized": true,
        "platform": "ios",
        "sdkVersion": holder.sdkVersion
      ])
    } catch {
      reject("EUDI_INIT_FAILED", error.localizedDescription, error)
    }
  }

  @objc(getAvailability:rejecter:)
  func getAvailability(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve([
      "initialized": holder.isInitialized,
      "platform": "ios",
      "sdkVersion": holder.sdkVersion
    ])
  }

  @objc(loadDocuments:rejecter:)
  func loadDocuments(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      let documents = try holder.loadDocuments()
      resolve(documents.map { EudiWalletMapper.toDictionary(document: $0) })
    } catch {
      reject("EUDI_LOAD_DOCUMENTS_FAILED", error.localizedDescription, error)
    }
  }

  @objc(issueDocumentByOffer:resolver:rejecter:)
  func issueDocumentByOffer(
    params: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let offerUri = params["offerUri"] as? String else {
      reject("EUDI_INVALID_PARAMS", "offerUri is required", nil)
      return
    }

    holder.issueDocumentByOffer(offerUri: offerUri) { result in
      switch result {
      case .success(let documents):
        resolve(documents.map { EudiWalletMapper.toDictionary(document: $0) })
      case .failure(let error):
        reject("EUDI_ISSUE_BY_OFFER_FAILED", error.localizedDescription, error)
      }
    }
  }

  @objc(issueDocumentByDocType:resolver:rejecter:)
  func issueDocumentByDocType(
    params: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    holder.issueDocumentByDocType(params: params) { result in
      switch result {
      case .success(let document):
        resolve(EudiWalletMapper.toDictionary(document: document))
      case .failure(let error):
        reject("EUDI_ISSUE_BY_DOCTYPE_FAILED", error.localizedDescription, error)
      }
    }
  }

  @objc(resumePendingAuthorization:resolver:rejecter:)
  func resumePendingAuthorization(
    url: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      try holder.resumePendingAuthorization(url: url)
      resolve(nil)
    } catch {
      reject("EUDI_RESUME_FAILED", error.localizedDescription, error)
    }
  }

  @objc(deleteDocument:resolver:rejecter:)
  func deleteDocument(
    documentId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      try holder.deleteDocument(id: documentId)
      resolve(nil)
    } catch {
      reject("EUDI_DELETE_FAILED", error.localizedDescription, error)
    }
  }

  @objc(resetWallet:rejecter:)
  func resetWallet(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      try holder.resetWallet()
      resolve(nil)
    } catch {
      reject("EUDI_RESET_FAILED", error.localizedDescription, error)
    }
  }
}
```

### 6.3 iOS 需要补的桥接声明

建议新增：
- `ios/DID/EudiWalletBridge.m`

```objc
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(EudiWalletBridge, NSObject)

RCT_EXTERN_METHOD(initialize:(NSDictionary *)params
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getAvailability:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(loadDocuments:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(issueDocumentByOffer:(NSDictionary *)params
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(issueDocumentByDocType:(NSDictionary *)params
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(resumePendingAuthorization:(NSString *)url
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deleteDocument:(NSString *)documentId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(resetWallet:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
```

---

## 7. Android Kotlin bridge 骨架

建议目录：
- `android/app/src/main/java/com/did/wallet/eudi/EudiWalletBridgeModule.kt`
- `android/app/src/main/java/com/did/wallet/eudi/EudiWalletBridgePackage.kt`
- `android/app/src/main/java/com/did/wallet/eudi/EudiWalletHolder.kt`
- `android/app/src/main/java/com/did/wallet/eudi/EudiWalletMapper.kt`

### 7.1 角色分工

`EudiWalletBridgeModule.kt`
- RN module
- 负责 Promise 接口

`EudiWalletHolder.kt`
- 持有 EUDI wallet manager / document manager / issuance manager
- 保证跨调用状态可持续

`EudiWalletMapper.kt`
- 把原生 document model 转为 `WritableMap`

### 7.2 Kotlin bridge 骨架

```kotlin
package com.did.wallet.eudi

import com.facebook.react.bridge.*

class EudiWalletBridgeModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  private val holder = EudiWalletHolder.getInstance(reactContext)

  override fun getName(): String = "EudiWalletBridge"

  @ReactMethod
  fun initialize(params: ReadableMap, promise: Promise) {
    try {
      val serviceName = params.getString("serviceName") ?: "DID Wallet"
      val userAuthenticationRequired =
        if (params.hasKey("userAuthenticationRequired")) params.getBoolean("userAuthenticationRequired") else true
      val openId4VciRedirectUri =
        if (params.hasKey("openId4VciRedirectUri")) params.getString("openId4VciRedirectUri") else null
      val openId4VpRedirectUri =
        if (params.hasKey("openId4VpRedirectUri")) params.getString("openId4VpRedirectUri") else null

      holder.initializeIfNeeded(
        serviceName = serviceName,
        userAuthenticationRequired = userAuthenticationRequired,
        openId4VciRedirectUri = openId4VciRedirectUri,
        openId4VpRedirectUri = openId4VpRedirectUri
      )

      val result = Arguments.createMap().apply {
        putBoolean("initialized", true)
        putString("platform", "android")
        putString("sdkVersion", holder.sdkVersion)
      }
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("EUDI_INIT_FAILED", e)
    }
  }

  @ReactMethod
  fun getAvailability(promise: Promise) {
    val result = Arguments.createMap().apply {
      putBoolean("initialized", holder.isInitialized)
      putString("platform", "android")
      putString("sdkVersion", holder.sdkVersion)
    }
    promise.resolve(result)
  }

  @ReactMethod
  fun loadDocuments(promise: Promise) {
    try {
      val documents = holder.loadDocuments()
      val array = Arguments.createArray()
      documents.forEach { array.pushMap(EudiWalletMapper.toWritableMap(it)) }
      promise.resolve(array)
    } catch (e: Exception) {
      promise.reject("EUDI_LOAD_DOCUMENTS_FAILED", e)
    }
  }

  @ReactMethod
  fun issueDocumentByOffer(params: ReadableMap, promise: Promise) {
    try {
      val offerUri = params.getString("offerUri")
        ?: throw IllegalArgumentException("offerUri is required")
      val documents = holder.issueDocumentByOffer(offerUri)
      val array = Arguments.createArray()
      documents.forEach { array.pushMap(EudiWalletMapper.toWritableMap(it)) }
      promise.resolve(array)
    } catch (e: Exception) {
      promise.reject("EUDI_ISSUE_BY_OFFER_FAILED", e)
    }
  }

  @ReactMethod
  fun issueDocumentByDocType(params: ReadableMap, promise: Promise) {
    try {
      val document = holder.issueDocumentByDocType(params)
      promise.resolve(EudiWalletMapper.toWritableMap(document))
    } catch (e: Exception) {
      promise.reject("EUDI_ISSUE_BY_DOCTYPE_FAILED", e)
    }
  }

  @ReactMethod
  fun resumePendingAuthorization(url: String, promise: Promise) {
    try {
      holder.resumePendingAuthorization(url)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("EUDI_RESUME_FAILED", e)
    }
  }

  @ReactMethod
  fun deleteDocument(documentId: String, promise: Promise) {
    try {
      holder.deleteDocument(documentId)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("EUDI_DELETE_FAILED", e)
    }
  }

  @ReactMethod
  fun resetWallet(promise: Promise) {
    try {
      holder.resetWallet()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("EUDI_RESET_FAILED", e)
    }
  }
}
```

### 7.3 Android package 骨架

```kotlin
package com.did.wallet.eudi

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class EudiWalletBridgePackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(EudiWalletBridgeModule(reactContext))
  }

  override fun createViewManagers(
    reactContext: ReactApplicationContext
  ): List<ViewManager<*, *>> = emptyList()
}
```

### 7.4 Android 注册点

第一阶段实现时，需要把 package 注册进 React Native host。

根据当前项目结构，注册方式要结合现有 Expo / New Architecture 工程决定，但设计目标是：
- `NativeModules.EudiWalletBridge` 在 JS 可用

---

## 8. 第一阶段配置项设计

### 8.1 RN 配置建议

建议通过 `app.config.ts` 和常量文件提供：

- `serviceName`
- `openId4VciRedirectUri`
- `openId4VpRedirectUri`
- 是否要求用户验证

建议新增：
- [src/constants/eudi.ts](/Users/naraku/Desktop/DID/src/constants/eudi.ts)

示例：

```ts
export const EUDI_WALLET_CONFIG = {
  serviceName: 'DID Wallet',
  userAuthenticationRequired: true,
  openId4VciRedirectUri: 'did://oid4vci',
  openId4VpRedirectUri: 'did://oid4vp',
} as const;
```

### 8.2 iOS / Android redirect URI

第一阶段就应提前确定：
- iOS deep link scheme
- Android intent filter / redirect URI

当前项目已有：
- `scheme: 'did'`

建议第一阶段沿用：
- `did://oid4vci`
- `did://oid4vp`

---

## 9. 第一阶段当前项目要修改的文件列表

以下是第一阶段建议改动的当前项目文件。

### 9.1 新增文件

RN：
- [src/native/bridges/EudiWalletBridge.ts](/Users/naraku/Desktop/DID/src/native/bridges/EudiWalletBridge.ts)
- [src/native/eudiWalletBridge.ts](/Users/naraku/Desktop/DID/src/native/eudiWalletBridge.ts)
- [src/services/walletCoreService.ts](/Users/naraku/Desktop/DID/src/services/walletCoreService.ts)
- [src/constants/eudi.ts](/Users/naraku/Desktop/DID/src/constants/eudi.ts)

iOS：
- `ios/DID/Features/EudiWallet/EudiWalletBridge.swift`
- `ios/DID/Features/EudiWallet/EudiWalletCoordinatorHolder.swift`
- `ios/DID/Features/EudiWallet/EudiWalletMapper.swift`
- `ios/DID/EudiWalletBridge.m`

Android：
- `android/app/src/main/java/com/did/wallet/eudi/EudiWalletBridgeModule.kt`
- `android/app/src/main/java/com/did/wallet/eudi/EudiWalletBridgePackage.kt`
- `android/app/src/main/java/com/did/wallet/eudi/EudiWalletHolder.kt`
- `android/app/src/main/java/com/did/wallet/eudi/EudiWalletMapper.kt`

### 9.2 需要调整的现有文件

- [app.config.ts](/Users/naraku/Desktop/DID/app.config.ts)
  - 补充 EUDI 相关 redirect URI / 原生配置说明

- [src/screens/onboarding/OnboardingScreen.tsx](/Users/naraku/Desktop/DID/src/screens/onboarding/OnboardingScreen.tsx)
  - 将“生成 DID”切成两步：
    1. 保留现有 didService 兼容逻辑
    2. 新增 wallet core 初始化逻辑

- [src/screens/profile/ProfileScreen.tsx](/Users/naraku/Desktop/DID/src/screens/profile/ProfileScreen.tsx)
  - 增加 wallet core 状态展示
  - 后续可新增“Load Wallet Documents” / “Reset Wallet Core” 调试入口

- [src/types/index.ts](/Users/naraku/Desktop/DID/src/types/index.ts)
  - 可补充 `WalletDocument` 类型，或改为从 `EudiWalletBridge.ts` 导出共享类型

- [src/services/didService.ts](/Users/naraku/Desktop/DID/src/services/didService.ts)
  - 第一阶段不删除
  - 标注为兼容层
  - 不再继续扩展新的钱包核心能力

### 9.3 第二阶段再考虑的文件

- [src/screens/wallet/WalletHomeScreen.tsx](/Users/naraku/Desktop/DID/src/screens/wallet/WalletHomeScreen.tsx)
  - 后续可将 EUDI 文档映射成钱包首页卡片

- [src/screens/wallet/NotificationsScreen.tsx](/Users/naraku/Desktop/DID/src/screens/wallet/NotificationsScreen.tsx)
  - 如果未来签发/展示流程需要通知联动，再补

---

## 10. 第一阶段实施步骤

### Step 1
新增 TS bridge contract 和 RN facade：
- `EudiWalletBridge.ts`
- `eudiWalletBridge.ts`
- `walletCoreService.ts`

### Step 2
在 iOS / Android 各自引入 EUDI 原生库，并把 bridge 空骨架编译通过

### Step 3
先实现最小能力：
- `initialize`
- `getAvailability`
- `loadDocuments`

### Step 4
在 `Profile` 页做调试入口：
- 初始化 wallet core
- 查看 availability
- 加载 documents

### Step 5
再实现 issuance：
- `issueDocumentByOffer`
- `resumePendingAuthorization`

### Step 6
最后才考虑把现有 onboarding 中的 DID 生成流程逐步改造成：
- 初始化 wallet core
- 发起凭证签发
- 展示本地文档

---

## 11. 风险与注意事项

### 11.1 不要把 EUDI 误当成当前 didService 的直接替代

EUDI 是钱包核心，不是单纯 `did:key` 服务。

### 11.2 第一阶段必须允许双轨并存

建议保留：
- `didService` 兼容层
- `walletCoreService` 新核心层

### 11.3 bridge 不要暴露原生复杂类型

RN 只能看到：
- plain object
- 简单字符串
- 文档数组

不要把原生 SDK 的复杂模型直接抛给 JS。

### 11.4 原生层只做能力，不做业务判断

原生层不应决定：
- 页面如何跳转
- 文档如何排序
- 哪个页面展示哪张卡

这些逻辑要留在 RN。

---

## 12. 第一阶段完成后的目标状态

如果第一阶段按本文档完成，项目会达到：

- 原生 EUDI Wallet Core 已成功接入双端
- RN 已有稳定 `EudiWalletBridge`
- `walletCoreService` 可完成最小钱包核心能力
- 当前 `didService` 仍可作为兼容层存在
- 后续可以继续推进：
  - `OID4VCI`
  - `OID4VP`
  - 文档展示
  - 文档删除与重置
  - 将旧 DID 流程逐步迁出

---

## 13. 推荐的第一批开发顺序

最推荐的落地顺序是：

1. 先写 TS 接口与 RN facade
2. 再接 iOS / Android 原生空实现
3. 再跑通 `initialize`
4. 再跑通 `loadDocuments`
5. 最后才实现 issuance / redirect 恢复

这样可以把风险拆小，不会一开始就陷入完整钱包流转集成。
