# Wallet Core 当前架构说明

## 目标

当前 `wallet-core` 已经从“协议工具集合”演进为应用内的钱包核心层，职责边界如下：

- `wallet-core` 负责协议、领域模型、读模型、统一 facade
- `credentialRepository` 负责原始凭证持久化
- `DocumentStore / DocumentManager` 负责页面读模型
- `walletWriteStore` 负责钱包写操作与 hydration
- UI 负责展示、导航与用户确认

这份文档描述的是当前已落地实现，不是规划态。

## 分层

### 1. Protocol Layer

路径：

- `src/wallet-core/protocol/oid4vci/*`
- `src/wallet-core/protocol/oid4vp/*`

职责：

- 解析 `credential_offer`、`request_uri`、request object
- 执行 OID4VCI / OID4VP 编排
- 生成 proof / key binding
- 匹配本地凭证
- 提交 presentation

输出：

- `ProtocolResult`

这一层不处理页面导航，也不直接操作 React 组件。

### 2. Capability Layer

路径：

- `src/wallet-core/did/*`
- `src/wallet-core/formats/*`
- `src/wallet-core/utils/*`
- `src/wallet-core/transport/*`
- `src/wallet-core/registry/*`
- `src/wallet-core/bootstrap/*`

职责：

- DID 与签名能力
- 凭证格式解析与展示映射
- HTTP / URL 处理
- handler / provider / format 注册
- 应用启动时的 builtins 注册

这一层为协议层提供底座能力。

### 3. Facade Layer

路径：

- `src/wallet-core/facade/*`

核心对象：

- `WalletCore`
- `IssuanceManager`
- `PresentationManager`

职责：

- 统一构建 `ProtocolContext`
- 将 URI 路由到 issuance / presentation
- 将协议结果提升为钱包域操作

输出：

- `WalletOperation`
- `IssuanceSession`
- `PresentationSession`

这一层是应用调用 `wallet-core` 的主入口。

### 4. Domain Layer

路径：

- `src/wallet-core/domain/*`

核心对象：

- `WalletDocument`
- `DocumentStore`
- `DocumentManager`

职责：

- 将 `VerifiableCredential` 映射成稳定的钱包读模型
- 为页面提供统一文档列表与按 id 查询
- 提供 `WalletOperation`、`IssuanceSession`、`PresentationSession` 等领域对象

这层的重点是把“协议对象”和“页面读模型”分开。

## 存储边界

### 1. credentialRepository

路径：

- `src/services/credentialRepository.ts`

职责：

- 持久化原始凭证
- 保存 `StoredCredential`
- 作为 raw credential 的权威来源

存储内容：

- `raw`
- `format`
- `storedAt`
- `displayModel`

### 2. DocumentStore / DocumentManager

路径：

- `src/wallet-core/domain/DocumentStore.ts`
- `src/wallet-core/domain/DocumentManager.ts`

职责：

- 保存页面使用的 `WalletDocument[]`
- 从 display credential 同步出读模型
- 提供 `listDocuments / getDocument / listCredentials / getCredential`

这是当前 UI 的主读模型。

### 3. walletWriteStore

路径：

- `src/store/walletWriteStore.ts`

职责：

- 新增凭证
- 更新凭证状态
- 撤销凭证
- 恢复钱包
- 清空钱包
- hydration 状态管理

这不是主读模型。

## 当前调用链

### 发证

```text
UI / Deep Link
  -> walletProtocolService
  -> WalletCore.handleUriOperation()
  -> IssuanceManager.handleWithHandler()
  -> OID4VCI handler
  -> credentialRepository.save()
  -> walletWriteStore.addCredential()
  -> DocumentStore 同步读模型
  -> UI 刷新 WalletDocument
```

### 出示

```text
UI / Scan
  -> walletProtocolService
  -> WalletCore.handleUriOperation()
  -> PresentationManager.handleWithHandler()
  -> OID4VP handler
  -> 返回 PresentationSession
  -> PresentationConfirmScreen 展示 WalletDocument
  -> WalletCore.submitPresentationOperation()
  -> PresentationManager.submit()
  -> OID4VP submit
```

## 页面依赖原则

页面层应该优先依赖：

- `WalletOperation`
- `IssuanceSession`
- `PresentationSession`
- `WalletDocument`

页面层不应该直接理解：

- `vp_token`
- `dcql`
- raw credential
- proof / kb-jwt 构造细节

## 当前已完成的测试保护

已覆盖：

- OID4VCI handler / auth flow / credential mapper
- OID4VP handler / request resolver / dcql matcher / key binding / submitter
- `IssuanceManager`
- `PresentationManager`
- `WalletCore`
- `DocumentStore / DocumentManager`

当前测试命令：

```bash
npm test -- --runInBand
npx tsc --noEmit
```

## 后续建议

下一阶段建议继续朝更完整的钱包 runtime 演进：

1. 引入更明确的 `WalletDocument` 生命周期管理
2. 增加 `DocumentManager` 级别的删除、刷新、状态同步能力
3. 引入 `TrustManager`
4. 引入更明确的 `KeyManager / SignerFactory`
5. 将 `walletProtocolService` 进一步收敛为薄适配层
6. 为 facade 和 domain 增加更多 fixture 级测试
