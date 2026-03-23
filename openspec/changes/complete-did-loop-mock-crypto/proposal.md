## Why
当前仓库前端协议栈较完整，但后端与 OpenID4VCI/OID4VP 的联调闭环仍偏演示化。需要在不引入真实签名体系前提下，建立一个可运行、可验证、可审查的首版闭环，确保后续替换真签名时仅替换加密层而不重做流程层。

## What Changes
- 新增 change: `complete-did-loop-mock-crypto`
- 明确并落地“mock crypto + real network flow”边界：
  - 签名继续 mock（HS256）
  - 协议路由、请求对象、回调提交、状态流转、错误处理均真实可跑
- 后端补全：
  - `/health`
  - OID4VCI-like 发证端点（offer/token/credential）
  - OID4VP-like 验证端点（request-object/submit/result）
  - CORS 配置与日志
- 前端补全：
  - OID4VCI/OID4VP handler 改为真实 HTTP 交互（直连后端）
  - 验证结果回显（Share 后反馈 valid/invalid）
  - 配置项新增 API base URL
- 提供最小验收脚本与联调 README。

## Impact
- 影响目录：`backend/`, `frontend/`, `openspec/`
- 不改动现有大结构，不引入破坏性重构
- 为后续接入真实 DID/JWK/SD-JWT 验签留出替换点
