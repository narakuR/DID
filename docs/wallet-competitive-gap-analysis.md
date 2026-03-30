# 钱包成品差距与竞品对标汇总

更新时间：2026-03-30

## 文档目的

这份文档将两次对比结论合并到一处，统一回答三个问题：

- 当前钱包已经做到什么程度
- 与欧盟参考钱包 / 竞品相比，还差哪些关键能力
- 哪些差距属于“产品收边”，哪些属于“协议或运行时能力未完成”

这份文档描述的是当前项目实际状态，不是目标态。

## 对标对象

本次对标基于以下公开材料：

- `eudi-lib-android-wallet-core`
  - <https://github.com/eu-digital-identity-wallet/eudi-lib-android-wallet-core/tree/main>
- `eudi-app-android-wallet-ui`
  - <https://github.com/eu-digital-identity-wallet/eudi-app-android-wallet-ui/tree/main>
- `EUDI Wallet Architecture and Reference Framework`
  - <https://digital-strategy.ec.europa.eu/en/library/european-digital-identity-wallet-architecture-and-reference-framework>

## 一句话结论

当前项目已经是“可真实联调的钱包雏形”，不是 demo。

但与欧盟参考钱包或成熟竞品相比，差距已经不主要在 `OID4VCI / OID4VP` 是否存在，而在：

- 验证能力是否完整
- 运行时是否稳定
- 安全与信任层是否完整
- 产品体验是否已经收成“可交付产品”

## 当前系统已完成能力

### 1. 协议与架构

已完成：

- 前端直连 issuer / verifier
- `wallet-core` 分层
- `OID4VCI` 主链路
- `OID4VP` 主链路
- `WalletCore / IssuanceManager / PresentationManager`
- `DocumentStore / DocumentManager`
- 本地凭证存储
- 真实活动日志

当前代码对应：

- `src/wallet-core/protocol/*`
- `src/wallet-core/facade/*`
- `src/wallet-core/domain/*`
- `src/services/walletProtocolService.ts`

### 2. 发证

已完成：

- 普通 issuance
- deferred issuance
- `sd-jwt-vc` 领取
- `mso_mdoc` 领取
- issuer metadata 动态读取
- “签发中”状态产品化

### 3. 出示 / 验证

已完成：

- `sd-jwt-vc` 的 request object 获取、匹配、提交
- verifier 直连
- 扫码进入 presentation confirm

当前限制：

- `mso_mdoc` 仅支持领取，不支持通过 `OID4VP` 出示
- verifier request / response 的兼容性仍在补全

### 4. 身份与密钥

已完成：

- `did:key`
- `did:jwk`
- `KeyManager`
- `SignerFactory`
- 冷启动身份检查
- 首次交互式身份初始化

当前限制：

- 冷启动身份体验刚完成第一轮产品化
- 仍未进入“成熟安全托管产品”阶段

### 5. 产品态

已完成：

- 添加证件页产品化收敛
- mock 证件与 mock 活动日志清理
- 真实证件分类开始落地
- 成功 / 失败 / pending 基本状态可见

## 与欧盟参考钱包的主要差距

## 1. `mso_mdoc` 出示能力

当前状态：

- `mso_mdoc` 可领取
- `mso_mdoc` 不可通过 `OID4VP` 出示

差距原因：

- 当前钱包没有 `DeviceResponse` 生成链路
- 当前格式层没有 holder-side `device-signed response` 能力

这项差距的影响：

- mdoc 类证件虽然能入卡
- 但不能作为“成品验证能力”对外宣称已完成

优先级：高

## 2. 近场出示能力

欧盟参考实现具备：

- QR
- NFC
- BLE / proximity presentation

当前状态：

- 仅 remote / browser / QR 远程链路
- 无近场会话层

优先级：中高

## 3. 安全托管与 Secure Area

欧盟参考实现强调：

- Android Keystore
- Secure Area
- 更成熟的原生密钥托管

当前状态：

- 已使用 `expo-secure-store`
- 已有 `did:key / did:jwk`
- 已有签名选择能力

但仍然缺：

- 硬件安全区级别抽象
- 更成熟的 key lifecycle
- 更明确的密钥轮换 / 多 key 策略

优先级：高

## 4. Trust / Attestation / 合规能力

欧盟参考实现与 ARF 更强调：

- reader trust store
- attestation provider
- issuer / verifier trust policy
- 更完整的算法与证书链约束

当前状态：

- 已有 `trust` 方向的架构位置
- 还没有真正形成产品级 `TrustManager`

优先级：高

## 5. 文档生命周期完整度

欧盟参考实现更接近完整 document runtime：

- issued document lifecycle
- deferred / notification / status resolution
- refresh / re-issue / revocation integration

当前状态：

- 已有 `WalletDocument / DocumentManager`
- 已有活动日志
- 已有撤销与续期页面

但还缺：

- 更正式的 document lifecycle 模型
- 统一状态流转
- 更完整的通知和恢复路径

优先级：中高

## 6. 原生运行时稳定性

欧盟参考实现作为原生 Android wallet runtime，天然更稳定。

当前项目仍暴露过这些典型问题：

- deep link handoff
- browser -> app 回跳
- Expo Router 抢路由
- QR 重复扫描
- Android 运行时边界问题

虽然这些问题正在逐步修复，但说明当前仍未达到“成品稳定性”。

优先级：高

## 成品化差距清单

下面这部分不是“对标论文级差距”，而是离可交付产品最近的实际缺口。

## A. 验证能力差距

### 已完成

- `sd-jwt-vc` 出示主链路
- verifier request object 获取
- 基本 DCQL 匹配

### 未完成

- `mso_mdoc DeviceResponse`
- `mso_mdoc` 的 verifier 提交兼容
- 更完整的 verifier request 变体兼容
- 出示前能力判断

### 当前建议

- 产品上明确标注：`mso_mdoc` 当前仅支持领取，不支持出示
- `sd-jwt-vc` 作为当前稳定验证主路径

## B. 身份初始化体验差距

### 已完成

- 冷启动非打断式身份检查
- 首次交互式身份初始化
- 用户取消认证不再直接显示为失败

### 仍需补充

- 主动初始化入口
- 更明确的身份状态说明
- 身份初始化成功后的反馈

## C. 证件分类与展示差距

### 已完成

- 初步 `credentialClassifier`
- `WalletDocument.category / canonicalType / displayType`
- 首页不再只按 `issuer.type` 粗分类

### 仍需补充

- 将格式层里的正式类型映射统一回灌到分类器
- 完成 `PID / EHIC / mDL / learning credential` 的稳定映射
- UI 文案本地化

## D. 活动日志与状态差距

### 已完成

- `RECEIVED`
- `PRESENTED`
- `REVOKED`
- 活动页真实日志

### 仍需补充

- `RENEWED`
- 验证成功 / 验证失败
- 发证失败
- 通知中心与活动日志联动

## E. 页面产品态差距

当前仍需继续统一：

- 首页空态
- 添加证件页文案与分层
- 不支持能力的禁用态
- 错误提示的可理解程度
- 中英文混用

## 当前能力成熟度粗估

仅用于排优先级，不是精确评测。

- 发证：75 / 100
- 出示 / 验证：40 / 100
- 身份 / DID / 密钥：60 / 100
- 文档与本地存储：70 / 100
- 产品体验：55 / 100
- 原生稳定性：45 / 100

整体：

- 可联调钱包雏形：约 65 / 100
- 成品可交付度：约 50-55 / 100

## 下一阶段优先级建议

### P0

- 明确 `mso_mdoc` 当前仅支持领取，不支持出示
- 把验证失败提示收成产品化边界，而不是协议错误
- 继续收 deep link / browser / scan 的稳定性

### P1

- 补 `TrustManager`
- 收身份初始化体验
- 收文案、本地化、空态、失败态

### P2

- 实现 `mso_mdoc DeviceResponse`
- 打通 `mso_mdoc` 的 `OID4VP` 出示

### P3

- 近场能力
- 更完整的原生安全区能力
- 更完整的文档生命周期与通知体系

## 对当前产品定位的建议

当前最准确的对外描述应是：

> 一个已具备真实发证能力、具备部分真实验证能力、正在向完整 EUDI 钱包运行时演进的前端钱包。

不建议当前对外宣称：

- 已完整支持 mdoc 验证
- 已达到欧盟参考钱包同等级运行时完整度
- 已具备完整安全与 trust 能力

## 与现有文档的关系

配套参考：

- `docs/wallet-core-refactor-plan.md`
- `docs/wallet-core-architecture.md`

这份文档聚焦的是：

- 对标差距
- 成品化缺口
- 优先级排序

而不是代码结构本身。
