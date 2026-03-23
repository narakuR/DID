# RN Wallet 研判结论与修复路径

> 生成日期：2026-03-23
> 基于审计报告：`rn-wallet-audit-report.md`

---

## 一、研判摘要

### 架构状态

当前仓库已具备完整的**插件式钱包内核结构**，包括：

- `IDIDProvider` / `ICredentialFormat` / `IProtocolHandler` / `IStorageBackend` 四大插件接口
- `PluginRegistry` 统一注册与路由
- 三类凭证格式处理器（SD-JWT VC / mso_mdoc / W3C JWT-VC）
- OID4VCI + OID4VP 协议主流程接入
- DCQL 查询集成（`dcql` v3 官方库）

### 各项能力评级

| 能力 | 评级 | 说明 |
|------|------|------|
| 可插拔移动端钱包 | 8/10 | 架构正确，注册机制已落地 |
| OpenID 协议支持 | 5/10 | 主流程已接入，验证/JWE/auth code callback 未完成 |
| 三类凭证解析 | 7/10 | 解析可用，verify() 均为 stub |
| DCQL 查询 | 6/10 | 查询已接入，VP 提交原始凭证链路断裂 |
| DID 配对 | 2/10 | 只有 DID provider，无 pairwise/DIDComm |

---

## 二、已确认缺口与根因定位

### 缺口 1（P0）：VP token 无法提交 — `_raw` 字段缺失

**根因**：整条链路断裂如下：

```
OID4VCI 接收凭证
  └─ Oid4vciHandler.ts:120  formatHandler.toDisplayModel(parsed)
       └─ 只保存 UI 展示对象，raw token 被丢弃
  └─ walletStore.addCredential(displayModel)
       └─ 存储不含 _raw 的 VerifiableCredential

OID4VP 出示凭证
  └─ Oid4vpHandler.ts:66  (credential as ... & { _raw?: string })._raw
       └─ 永远取到 undefined
  └─ 第 70 行 fallback：vpToken[queryId] = credential.id
       └─ VP token 变成 id 字符串，验证器必然拒绝
```

**涉及文件**：
- `src/types/index.ts`：`VerifiableCredential` 缺少 `_raw?: string` 和 `_format?` 字段
- `src/plugins/protocols/Oid4vciHandler.ts`：第 119-120 行未附加 `_raw`

---

### 缺口 2（P0）：Auth code flow 未闭环

**根因**：`Oid4vciHandler.handle()` 对 `grantType === 'urn:ietf:params:oauth:grant-type:pre-authorized_code'` 有完整流程，但对 `authorization_code` grant 只返回 `{ type: 'redirect', url }`，无后续 callback 恢复机制。

**涉及文件**：
- `src/plugins/protocols/Oid4vciHandler.ts`：缺少 `_pendingAuthCodeRequests` 存储和 callback 处理分支

---

### 缺口 3（P1）：Mock 数据 fallback

**根因**：`walletStore.ts:65` 使用 `saved ?? MOCK_CREDENTIALS`，清除本地存储后会加载测试凭证。

**涉及文件**：
- `src/store/walletStore.ts`：第 65 行

---

### 缺口 4（P1）：三类凭证 verify() 均为 stub

**根因**：三个 format handler 的 `verify()` 均直接返回 `{ valid: true }`，不做任何签名校验。

**涉及文件**：
- `src/plugins/formats/W3cJwtVcFormat.ts`：第 67-70 行
- `src/plugins/formats/SdJwtVcFormat.ts`：第 91-94 行
- `src/plugins/formats/MdocFormat.ts`：第 92-95 行

> **注**：此缺口列入 P2，实现成本高，按规范顺序分阶段完成。

---

### 缺口 5（P1）：MdocFormat selectDisclose 语义不清晰

**根因**：`MdocFormat.selectDisclose()` 返回原始 raw 而不做任何过滤，注释未说明这是 ISO 层级限制而非实现缺陷。

**涉及文件**：
- `src/plugins/formats/MdocFormat.ts`：`selectDisclose()` 方法

---

## 三、修复步骤表

### P0（必须优先完成）

| 步骤 | 文件 | 改动内容 |
|------|------|---------|
| B | `src/types/index.ts` | `VerifiableCredential` 接口新增 `_raw?: string` 和 `_format?` |
| C | `src/plugins/protocols/Oid4vciHandler.ts` | 第 120 行后附加 `displayModel._raw = raw; displayModel._format = parsed.format` |
| D | `src/plugins/protocols/Oid4vciHandler.ts` | 新增 `_pendingAuthCodeRequests` + callback URI 识别 + `authorization_code` 换 token 逻辑 |

### P1（强烈建议）

| 步骤 | 文件 | 改动内容 |
|------|------|---------|
| E | `src/store/walletStore.ts` | `MOCK_CREDENTIALS` → `[]`，移除对应 import |
| F | `src/plugins/formats/MdocFormat.ts` | `selectDisclose()` 补全 ISO 18013-7 层级限制注释 |

### P2（后续演进）

| 优先级 | 内容 |
|--------|------|
| 7 | W3C JWT-VC `verify()`：`parseJwtUnsafe` + DID resolve + `@noble/curves` 验签 |
| 8 | SD-JWT VC `verify()`：issuer signature + holder binding |
| 9 | mdoc `verify()`：X.509 IssuerAuth 验证 |
| 10 | PEX 真正匹配（当前 fallback 传入所有凭证） |
| 11 | 嵌套 DCQL claim path（当前只取 `path[0]`） |
| 12 | DID pairing / connection layer（PairwiseDidFactory + ConnectionRepository） |
| 13 | OID4VP request object 签名验证（当前 `verifyJwtStub` 直通） |

---

## 四、验证方法

| 步骤 | 验证方式 |
|------|---------|
| B+C | `npx tsc --noEmit` 无错误；断点 `Oid4vpHandler:buildDcqlVpToken`，`rawCredential` 不再为 undefined |
| D | 传入 `did://oid4vci/callback?code=test&state=xxx`，`canHandle()` 返回 true，`handle()` 到达 callback 分支 |
| E | 清除 AsyncStorage 后重启，`useWalletStore.getState().credentials` 为 `[]` |
| F | 代码审阅：注释包含"ISO 18013-7"和"DeviceResponse"关键词 |
