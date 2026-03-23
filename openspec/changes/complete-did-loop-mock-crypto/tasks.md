## 1. OpenSpec artifacts
- [x] 新建 change: `complete-did-loop-mock-crypto`
- [x] 补全 proposal.md / design.md / tasks.md
- [x] 新增可验证需求规格（flow、错误、可观测性）

## 2. Backend implementation
- [x] 补全 health endpoint
- [x] 实现 OID4VCI-like: `/api/oid4vci/credential-offer|token|credential`
- [x] 实现 OID4VP-like: `/api/verifications/request|:id/request-object|:id/submit|:id/result`
- [x] 增加 CORS 环境配置（`CORS_ORIGIN`）
- [x] 增加关键日志

## 3. Frontend integration
- [x] Oid4vciHandler 改造为真实 HTTP 流程
- [x] Oid4vpHandler 改造为 request_uri 获取 + response_uri 提交
- [x] 提交后显示 verifier 校验结果
- [x] 增加 API base URL 配置（`EXPO_PUBLIC_API_BASE_URL`）

## 4. Validation & docs
- [x] 新增最小验收脚本 `backend/scripts/acceptance-loop.mjs`
- [x] 新增联调步骤文档 `README-LOOP.md`
- [ ] 前端真机扫码 + 回显人工验收（待执行）
