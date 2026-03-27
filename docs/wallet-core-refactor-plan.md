# Wallet Core 重构方案与签证流转架构

## 目标

将 App 重构为纯前端协议钱包：

- 不依赖自有中间后端完成主流程
- 直接通过标准协议对接发行方与验证方
- 将协议、格式、密钥、信任、存储与 UI 分层

## 重构清单

1. 建立 `src/wallet-core/` 目录，承载协议内核。
2. 将 OID4VCI 流程从 UI/service 中抽离到 `wallet-core/protocol/oid4vci/`。
3. 将 OID4VP 流程从 UI/service 中抽离到 `wallet-core/protocol/oid4vp/`。
4. 保留现有 plugin registry 入口，但内部转发到 `wallet-core/registry`。
5. 将 DID 与签名能力统一收口到 `wallet-core/did/`。
6. 将凭证格式处理统一收口到 `wallet-core/formats/`。
7. 建立 `wallet-core/transport/`，统一 URL 重写、请求、提交与超时策略。
8. 拆分集成配置为 `app / credentials / profiles / trust` 四类。
9. 引入 `profile registry`，按协议变体而不是按具体厂商写逻辑。
10. 引入 `trust policy`，统一算法、证书、issuer/verifier 信任规则。
11. 将 `walletProtocolService` 降级为 façade，只做上下文构造与结果持久化。
12. 将 `protocolFlowService` 降级为导航编排，只做跳转与回调处理。
13. 将原始凭证与展示模型分层存储，避免 UI 直接依赖 raw token。
14. 为 presentation 增加显式 session store，记录 request、匹配结果与提交结果。
15. 将 `DID-Service` 降级为 mock/demo 工具，不再作为产品主链路依赖。
16. 为 OID4VCI、OID4VP、SD-JWT disclosure、direct_post 增加协议层测试。
17. 最后清理旧路径与散落逻辑，避免继续在页面和 service 中堆积协议分支。

## 推荐目录结构

```text
src/
  wallet-core/
    protocol/
      oid4vci/
      oid4vp/
    formats/
      sd-jwt-vc/
      jwt-vc-json/
      mso-mdoc/
    did/
    transport/
    trust/
    profiles/
    registry/
    storage/
    types/
  features/
    issuance/
    presentation/
    credentials/
    scan/
```

## 分阶段执行

### 阶段 1

- 建立 `wallet-core` 骨架
- 迁移共享类型、registry、transport
- 保持旧入口文件对新层的 re-export / forwarding

### 阶段 2

- 拆 OID4VCI 为 `offerResolver / authFlow / proofBuilder / credentialMapper`
- 保持旧 `Oid4vciHandler` 作为兼容入口

### 阶段 3

- 拆 OID4VP 为 `requestObjectResolver / dcqlMatcher / keyBindingBuilder / presentationSubmitter`
- 引入 `presentationSessionStore`

### 阶段 4

- 拆配置
- 引入 `profile registry`
- 引入 `trust policy`

### 阶段 5

- 页面全部改为仅依赖 façade
- 清理旧路径与重复工具函数

## 架构图

```text
┌─────────────────────────────────────────────────────────────────────┐
│                              Wallet App                            │
├─────────────────────────────────────────────────────────────────────┤
│ UI Layer                                                           │
│  Scan / Issuance / Credential List / Presentation Confirm          │
├─────────────────────────────────────────────────────────────────────┤
│ App Flow Layer                                                     │
│  protocolFlowService / walletProtocolService                       │
│  只负责导航、编排、状态衔接                                          │
├─────────────────────────────────────────────────────────────────────┤
│ Wallet Core                                                        │
│                                                                     │
│  ┌────────────────────┐   ┌────────────────────┐                    │
│  │ OID4VCI Client     │   │ OID4VP Client      │                    │
│  │ - resolve offer    │   │ - resolve request  │                    │
│  │ - auth flow        │   │ - match query      │                    │
│  │ - token exchange   │   │ - build vp_token   │                    │
│  │ - credential req   │   │ - direct_post      │                    │
│  └────────────────────┘   └────────────────────┘                    │
│             │                        │                               │
│             ├──────────┬─────────────┤                               │
│             │          │             │                               │
│  ┌────────────────┐ ┌────────────────────┐ ┌──────────────────────┐  │
│  │ Format Handlers │ │ DID/Key Providers  │ │ Trust/Profile Layer  │  │
│  │ sd-jwt-vc       │ │ did:key            │ │ eudi / haip / custom │  │
│  │ jwt-vc-json     │ │ did:jwk            │ │ alg / issuer policy  │  │
│  │ mdoc            │ │ signer factory     │ │ verifier policy      │  │
│  └────────────────┘ └────────────────────┘ └──────────────────────┘  │
│                         │                                             │
│                  ┌───────────────┐                                    │
│                  │ Transport     │                                    │
│                  │ fetch / TLS   │                                    │
│                  │ retry / parse │                                    │
│                  └───────────────┘                                    │
├─────────────────────────────────────────────────────────────────────┤
│ Local Storage                                                        │
│  keys / did metadata / raw credentials / display models / sessions   │
└─────────────────────────────────────────────────────────────────────┘
```

## 签证获取到展示并验证的时序图

```text
用户/钱包App              发行方 Issuer                验证方 Verifier
    │                          │                              │
    │ 1. 扫码/点击签证领取链接     │                              │
    │─────────────────────────>│                              │
    │ 2. 获取 credential offer   │                              │
    │<─────────────────────────│                              │
    │ 3. 获取 issuer metadata    │                              │
    │─────────────────────────>│                              │
    │<─────────────────────────│                              │
    │ 4. 浏览器授权并回跳         │                              │
    │<──── 浏览器授权跳转/回调 ──>│                              │
    │ 5. 本地生成 proof          │                              │
    │ 6. 请求 credential         │                              │
    │─────────────────────────>│                              │
    │ 7. 返回签证凭证 SD-JWT VC   │                              │
    │<─────────────────────────│                              │
    │ 8. 本地保存 raw + 展示模型   │                              │
    │ 9. 首页展示签证卡片         │                              │
    │                          │                              │
    │ 10. 扫码验证链接            │                              │
    │────────────────────────────────────────────────────────> │
    │ 11. 获取 request object    │                              │
    │<──────────────────────────────────────────────────────── │
    │ 12. 匹配本地签证凭证         │                              │
    │ 13. 选择披露字段             │                              │
    │ 14. 本地生成 kb-jwt         │                              │
    │ 15. direct_post vp_token   │                              │
    │────────────────────────────────────────────────────────> │
    │                          │                              │
    │ 16. 验证成功/失败结果        │                              │
    │<──────────────────────────────────────────────────────── │
```

## 当前落地策略

当前代码改动遵循以下原则：

- 先引入 `wallet-core` 新层
- 旧入口保留，内部转发到新层
- 不一次性重写 UI 和协议逻辑
- 先保证兼容，再逐步替换实现
