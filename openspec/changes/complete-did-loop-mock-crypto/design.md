## Context
目标是尽快形成闭环 MVP：
1. Issuer 生成 offer URI（二维码）
2. Wallet 扫码后完成 pre-auth code 换 token + 拉取 credential
3. Wallet 持证后接收 verifier request_uri
4. Wallet 展示待出示内容，用户确认后提交 vp_token
5. Verifier 实时校验并回显结果

## Design Decisions

### 1) 协议分层与 mock 边界
- 保留 URI Scheme 与字段语义（`openid-credential-offer://`, `openid4vp://`, `request_uri`, `response_uri`）
- mock 仅限签名算法与 trust anchor（HS256 / in-memory state）
- 流程链路全部真实 HTTP

### 2) 后端状态模型（in-memory）
- `preAuthCodeStore`：offer -> pre-authorized code
- `accessTokenStore`：access_token -> issuance payload
- `verificationStore`：verification request -> status/result

### 3) 前端处理策略
- OID4VCI handler：解析 offer -> token -> credential -> 格式插件解析入库
- OID4VP handler：解析 request_uri -> 匹配本地 credential -> 暂存待提交 request -> submitPresentation
- 提交后直接消费 verifier 返回结果并在 UI 回显

### 4) 观测性
- 后端关键状态切换日志：创建 offer、发 token、签发 credential、创建验证请求、验证结果
- 健康探针：`/health`

## Trade-offs
- 未做持久化（重启丢状态）以保持 MVP 简洁
- 未实现标准 metadata discovery、JARM、JWE
- 未做多 credential 聚合 VP，仅首条匹配

## Future Evolution
- 替换 HS256 为 DID/JWK 真签名与验签
- 引入 Redis/DB 持久化状态
- 完整 OID4VCI/OID4VP 兼容层（metadata discovery, authorization code flow, error registry）
