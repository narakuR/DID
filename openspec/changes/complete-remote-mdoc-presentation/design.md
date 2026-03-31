## Context

当前钱包已经具备真实 issuer/verifier 联调能力，`sd-jwt-vc` 的远程 OID4VP 展示链路也已基本可用，但 `mso_mdoc` 仍停留在“可领取、可存储、不可远程展示”的状态。现有实现将展示签名路径建立在统一的 holder key 模型上，这适用于 `sd-jwt-vc` 的 key binding JWT，但不适用于 `mso_mdoc` 的 `DeviceResponse` 生成与 device signature 校验。

这次变更是一个跨层改造：它同时影响 `wallet-core` 的协议层、格式层、身份层和文档域模型，也会影响首页、详情页、分享确认页和错误反馈的产品语义。它还必须与现有本地 verifier 的 `mso_mdoc` 校验实现保持一致，尤其是在 `SessionTranscript`、`DeviceAuthentication`、`DeviceResponse` 结构和文档级 key 语义上。

## Goals / Non-Goals

**Goals:**
- 完成 `mso_mdoc` 通过 remote OID4VP 远程展示提交的主链路。
- 为 `mso_mdoc` 引入文档级 `device key` 模型，不再复用当前 holder key 展示路径。
- 让 `WalletDocument` 能表达“证件内容”和“证件出示能力”两层状态。
- 让首页、详情页、分享确认页和错误反馈基于真实能力边界收口为成品态。

**Non-Goals:**
- 不实现 proximity / NFC / BLE / handover transport。
- 不实现跨设备 document key 迁移或完整换机恢复。
- 不覆盖全部高级 verifier profile 或所有 EUDI 运行时能力。
- 不统一所有格式的恢复策略；本次只定义 `mso_mdoc` 的 remote presentation 运行时模型。

## Decisions

### 1. 为 `mso_mdoc` 引入独立的 remote presentation runtime
`mso_mdoc` 的展示不再通过通用 `presentationSubmitter` 里的 `sd-jwt` 路径变体完成，而是新增一条独立运行时支线，负责：
- 从 request object 中读取 `docType`、claims 和提交上下文
- 将 claims 映射到 `nameSpaces` / data elements
- 查询当前文档绑定的 device key
- 构造 `SessionTranscript`
- 生成 `DeviceAuthentication`
- 生成并编码 `DeviceResponse`

选择这条路线，是因为 `mdoc` 的展示 artifact 不是 `kb-jwt`，而是带 device signature 的 `DeviceResponse`。继续沿用 holder key 路径会让模型继续混淆，也无法支撑未来多 `mdoc` 文档的扩展。

备选方案：
- 直接在 `MdocFormat` 内扩展 `selectDisclose()` 输出 `DeviceResponse`
  - 放弃原因：`MdocFormat` 应负责文档理解与解析，不应承担 request/session/key/runtime 级职责。

### 2. 将 `document-device-key` 作为文档级绑定模型，而不是钱包全局 signer 的变体
这次设计明确引入“文档级 device key”语义。`sd-jwt-vc` 仍然走 holder key；`mso_mdoc` 的 remote presentation 则走 document-bound key。

这样建模的原因是：
- `mdoc` 的展示签名要与文档绑定，而不是与钱包全局身份绑定
- verifier 验证的是 `DeviceResponse` 内的 device signature，而不是 holder DID
- 这也为未来换机、重签发、恢复需求提供了明确语义位置

备选方案：
- 短期内先复用 holder key，但只在代码中做格式分支
  - 放弃原因：虽然实现快，但会把 `mdoc` 的长期模型做错，后续多 `mdoc`、换机和恢复都会返工。

### 3. 将“证件已入卡”和“证件可展示”拆成两个状态
`WalletDocument` 需要开始承载展示能力和展示状态，而不只是标题、类别和原始 credential 的读模型。设计上增加：
- `presentationCapabilities`
- `presentationBinding`
- `presentationState`

原因：
- `mdoc` 可能出现“证件在卡包中，但当前设备缺少可用 device key”
- 页面必须能够提前说明“为什么这张证现在不能分享”

备选方案：
- 只在分享按钮点击后再返回错误
  - 放弃原因：这会继续把运行时错误暴露给用户，而不是把能力边界产品化。

### 4. 产品收口以“能力显式化”为主，不以隐藏限制为主
首页、详情页、分享确认页都会基于 `presentationCapabilities` 和 `presentationState` 来表达：
- 是否支持 remote OID4VP
- 是否支持 proximity
- 当前不可展示原因
- 是否需要恢复或重签发

原因：
- 当前钱包已从 demo 进入成品化阶段，用户预期必须与真实能力一致
- `mdoc` 不能再作为“能解析但不能用”的隐式状态存在

### 5. 近场展示继续独立建模，不与本次 remote mdoc 变更耦合
虽然 `mdoc` 的近场展示未来会复用部分概念（如 `DeviceResponse`、session transcript），但本次明确只支持 remote OID4VP，不把 proximity transport 引入当前实现范围。

原因：
- 限制 scope，避免 proximity、NFC、BLE、handover 一并进入
- 保持这次变更聚焦在“mdoc remote runtime + 产品收口”

## Risks / Trade-offs

- [文档级 device key 生命周期尚不完整] → 本次只建立文档级绑定模型和展示状态，不在本版内实现跨设备迁移；用 `migration_required` / `reissuance_required` 状态显式表达。
- [`mdoc` verifier 兼容性可能因 request 变体不同而增加复杂度] → 先以当前本地 verifier 链路为基准实现主路径，并在 runtime 中保留 request mapping 边界。
- [产品侧状态显式化会暴露更多“暂不支持”状态] → 通过明确能力标签和恢复提示，把限制转化成可理解反馈，而不是 400 或协议错误。
- [`sd-jwt-vc` 与 `mso_mdoc` 展示路径分离会增加代码量] → 这是必要的复杂度，避免继续把两种不同模型压入同一套 signing path。

## Migration Plan

1. 先为 `WalletDocument` 和相关 domain store 增加展示能力与绑定状态读模型，但不改变现有 `sd-jwt-vc` 行为。
2. 引入 `mdoc` remote presentation runtime，并将 `presentationSubmitter` 改造为按 binding / format 分流。
3. 为 `mso_mdoc` 文档接入 document-bound key lookup 与 `DeviceResponse` 构造。
4. 在分享确认页、详情页和首页接入新能力模型，并将原“硬错误”替换为产品态反馈。
5. 验证本地 verifier 的 `mso_mdoc` 远程展示主路径，保留 `sd-jwt-vc` 回归验证。

回滚策略：
- 如果 `mdoc` 远程展示主路径未稳定，可暂时关闭 `mso_mdoc` 的 `remoteOid4vp` 能力开关，保留新域模型和产品态表达，不影响 `sd-jwt-vc` 主链路。

## Open Questions

- 发行阶段写入 `mdoc` 的 device key 与当前钱包 holder key 之间是否存在可复用关系，还是必须从现在开始独立管理每张文档的 device key。
- `document-device-key` 应落在独立 `DocumentKeyStore`，还是先与现有 repository 绑定后再逐步抽离。
- 首版 `mdoc` remote presentation 是否只验证当前本地 PID verifier 场景，还是要同时覆盖已有的其他 `mdoc` docType。
