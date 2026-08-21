---
description: 智能合约安全规范与现有合约维护约束
paths: contracts/**
---

# 智能合约规范

## 现有合约（保留，禁止修改）

- `contracts/PrivateBank.sol`、`contracts/EthRedPacket.sol` 是周六作业的教学示例合约，配套 `README.md` 中的 Remix 演示步骤。
- **不得删除、重命名或修改这两个合约的业务逻辑**，除非用户明确要求。如需扩展功能，新建独立合约文件，不要改动原文件。
- 两个合约均未使用 Foundry/Hardhat 工程化结构（无 `foundry.toml`/`hardhat.config`），设计为直接复制进 Remix 编译部署；在补充新合约或引入工程化工具前，先确认是否会影响现有 Remix 演示流程。

## 安全规范（适用于所有新增/修改的合约代码）

- 遵循 Checks-Effects-Interactions：先校验（`require`）、再更新状态、最后做外部调用（ETH 转账、外部合约调用）。
- 涉及外部调用或转账的函数使用 `nonReentrant`（重入锁）修饰符防止重入攻击，参考现有两个合约的实现方式。
- 涉及权限的函数（如仅创建者/Owner 可调用）必须显式 `require` 校验调用者身份。
- 涉及计数或余额的算术运算注意边界条件（如最后一份红包直接发放全部剩余金额，避免尾数遗留）。
- 不使用 `block.timestamp`、`block.prevrandao` 等链上数据作为真实资金场景的安全随机源；仅可用于教学演示并需在注释中说明局限性（参考 `EthRedPacket.sol` 现有注释）。
- 涉及 ERC-20/ERC-721 的合约（PRD 第 7 节：`YDToken`、`YDFaucet`、`Web3University`、`CourseCertificate`、`DemoCompletionOracle`）基于 OpenZeppelin 标准实现，转账使用 `SafeERC20`——已在 `contracts/web3-university/`（独立 Foundry 工程，`specs/11.yd-token-faucet/`~`specs/13.course-certificate-completion/`）完成 MVP，任何 `immutable` 地址字段（owner、token 引用等）必须在构造函数校验非零地址（零地址部署后无法修复）；课程价格等业务配置必须从链上状态读取，不得在函数体内硬编码。前端已通过 `lib/contracts/`/`lib/purchase/`（`specs/14.contract-client-foundation/`~`specs/16.onchain-completion-certificate/`）接入本地 Anvil 部署的这些合约；部署到 Sepolia/主网仍是后续里程碑。

## 审计检查清单（新增合约代码前自查）

- [ ] 所有外部可调用的状态变更函数是否有必要的权限/前置条件校验？
- [ ] 是否存在重入风险（外部调用后是否还有状态变更）？
- [ ] 关键事件（状态变化、转账）是否都 `emit` 了对应事件？
- [ ] 是否复用了现有的重入锁/校验模式，而非引入新的不一致写法？
