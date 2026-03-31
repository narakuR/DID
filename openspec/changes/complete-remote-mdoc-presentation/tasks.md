## 1. 文档级展示模型

- [x] 1.1 为 `WalletDocument` 增加 `presentationCapabilities`、`presentationBinding` 和 `presentationState` 读模型字段
- [x] 1.2 引入 `document-device-key` 概念，并定义与 holder key 分离的文档级 key binding 类型
- [x] 1.3 为 `DocumentManager` 增加基于文档返回展示能力、展示状态和恢复原因的读取接口
- [x] 1.4 为 `mso_mdoc` 文档设计本地 `device key` 引用与状态存储边界

## 2. mdoc Remote Presentation Runtime

- [x] 2.1 为 OID4VP 增加 `mso_mdoc` 专用 remote presentation runtime 入口
- [x] 2.2 实现从 request object / DCQL 到 `mso_mdoc` namespace 与 claims 的映射
- [x] 2.3 实现基于文档级 device key 的 `SessionTranscript`、`DeviceAuthentication` 与 `DeviceResponse` 构造流程
- [x] 2.4 将 `presentationSubmitter` 改造为按 `sd-jwt-vc` 与 `mso_mdoc` 的展示模型分流提交
- [x] 2.5 保持现有 `sd-jwt-vc` 远程展示路径不回归

## 3. 产品收口

- [x] 3.1 在首页与详情页显示证件的 remote / proximity 展示能力与当前展示状态
- [x] 3.2 在分享确认页基于文档能力与状态决定是否允许继续分享
- [x] 3.3 将 `mso_mdoc` 相关失败态收口为用户可理解的产品提示，而不是直接暴露协议错误
- [x] 3.4 为“证件已入卡但不可展示”增加明确的恢复或重签发说明

## 4. 验证与回归

- [x] 4.1 为 `mso_mdoc` remote presentation runtime 增加单元测试，覆盖成功构造 `DeviceResponse` 与关键失败态
- [x] 4.2 为文档级展示能力和展示状态读模型增加测试
- [x] 4.3 为 `did-loop` 增加 `mso_mdoc` remote OID4VP 成功场景与不可展示场景回归验证
- [ ] 4.4 手动验证当前本地 verifier 的 `mso_mdoc` 远程展示主路径，并记录已知限制
