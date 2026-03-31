## Why

当前钱包已经支持真实 issuer/verifier 联调、`sd-jwt-vc` 远程展示以及 `mso_mdoc` 领取，但 `mso_mdoc` 仍停留在“可入卡、不可通过 OID4VP 远程展示”的状态。这使得 `mdoc` 类证件虽然已经进入钱包，却还不能作为正式可用证件被产品承诺，同时钱包的产品边界、错误反馈和证件能力说明也还没有收成成品态。

## What Changes

- 新增 `mso_mdoc` 远程 OID4VP 展示能力，支持根据 verifier request 构造 `DeviceResponse` 并完成远程提交。
- 为 `mso_mdoc` 引入文档级 `device key` 绑定模型，不再复用当前统一的 holder key 展示路径。
- 为证件引入显式展示能力模型，区分 remote OID4VP、proximity 和当前不可用原因。
- 升级文档域模型与展示确认流程，使“证件已入卡”和“证件可展示”成为两个独立状态。
- 收口首页、详情页、分享确认页和错误反馈，让当前支持范围、限制条件和恢复要求对用户可见。

## Capabilities

### New Capabilities
- `mdoc-remote-presentation`: 钱包基于文档级 device key 生成 `mso_mdoc` 的 `DeviceResponse` 并通过 remote OID4VP 完成远程展示提交的能力。

### Modified Capabilities
- `did-loop`: 钱包在展示链路中需要明确区分 `sd-jwt-vc` 与 `mso_mdoc` 的展示模型、展示能力状态和用户可见反馈。

## Impact

- 受影响代码：
  - `src/wallet-core/protocol/oid4vp/*`
  - `src/wallet-core/formats/MdocFormat.ts`
  - `src/wallet-core/domain/*`
  - `src/wallet-core/did/*`
  - `src/screens/presentation/*`
  - `src/screens/credential/*`
  - `src/screens/wallet/*`
- 新增系统边界：
  - `mso_mdoc` remote presentation runtime
  - document-bound device key model
  - document presentation capability model
- 对产品行为的影响：
  - `mso_mdoc` 从“可领取格式”升级为“可远程展示的正式证件类型”
  - 页面必须明确表达证件是否可远程展示、是否需要设备级 key、以及当前不支持或需恢复的原因
