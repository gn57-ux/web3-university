# yd-token-faucet — 需求规格

## 概述

新建独立的 Foundry 工程，实现 `YDToken`（ERC-20 课程支付代币）与 `YDFaucet`（每地址限领一次 20 YD 的水龙头），作为 Web3 University 智能合约 MVP 的第一个里程碑（对应 `docs/PRD.md` 第 15 节「里程碑一：合约闭环」的起点）。本 feature 同时负责搭建后续 12、13 两个合约 feature 共用的 Foundry 工程骨架（`foundry.toml`、OpenZeppelin 依赖、测试/覆盖率/格式化命令）。

## 项目信息

- 项目名: web3-university
- 架构类型: 单体仓库（Next.js 前端 + 独立 Foundry 合约子工程）
- 新增子工程路径: `contracts/web3-university/`（与现有 `contracts/PrivateBank.sol`、`contracts/EthRedPacket.sol` 两个 Remix 教学示例文件平级但物理隔离，互不影响）

## 需求版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-19 | v1 | 初始需求 |

## 用户故事

- 作为学生，我想要在测试网领取一次固定数量的 YD Token，以便有余额购买课程。
- 作为 Owner，我想要在 Faucet 余额不足时能够补充资金，以便水龙头持续可用。
- 作为开发者，我想要一个标准化的 Foundry 工程骨架，以便后续合约 feature（12、13）可以直接复用测试/覆盖率/格式化工作流，不必重复搭建。

## 功能需求

1. [F-001] 新建 Foundry 工程 `contracts/web3-university/`：`solc 0.8.24`，安装 OpenZeppelin Contracts 库，`foundry.toml` 配置编译器版本、优化器、`fmt` 规则；`forge build`/`forge test`/`forge fmt`/`forge coverage` 均可在该子目录下正常运行。
2. [F-002] `YDToken`：标准 ERC-20（`name = "YD Token"`，`symbol = "YD"`，`decimals = 18`），基于 OpenZeppelin `ERC20` 实现；部署时向构造函数指定的地址一次性铸造初始供应量，**不提供部署后追加铸造的入口**（MVP 阶段不需要，避免预留用不到的铸造权限攻击面）。
3. [F-003] `YDFaucet`：持有一部分 YD 余额，`claim()` 允许每个地址领取且仅领取一次 20 YD（使用最小单位 `20e18`）；`fund(uint256 amount)` 仅 Owner 可调用，通过 `SafeERC20` 从 Owner 地址拉取 YD 补充至 Faucet；余额不足时 `claim()` 必须以自定义 error 明确拒绝，不得静默失败或返回 0。
4. [F-004] `YDFaucet` 使用自定义 error（非 `require` 字符串）表达：已领取过、Faucet 余额不足、非 Owner 调用 `fund`。
5. [F-005] 领取成功时发出 `TokensClaimed(address indexed student, uint256 amount)` 事件；`fund()` 成功时发出 `FaucetFunded(address indexed funder, uint256 amount)` 事件。
6. [F-006] 提供 Foundry 部署脚本 `script/DeployTokenFaucet.s.sol`：本地/dry-run 部署 `YDToken` + `YDFaucet` 并完成初始资金划转（Owner 铸造供应量后转一部分给 Faucet），**不得包含任何真实私钥、Sepolia RPC URL 或广播到真实网络的调用**——脚本只用于 `forge script`（无 `--broadcast`）的本地模拟验证。

## 非功能需求

- 安全: 遵循 `.claude/rules/smart-contract.md` 审计清单——所有外部可调用的状态变更函数具备权限/前置条件校验；`YDFaucet.fund()` 使用 `SafeERC20`；关键事件均 `emit`。
- 测试: 单元测试覆盖率（`forge coverage`）针对本 feature 新增的 `YDToken.sol`、`YDFaucet.sol` 两个文件的行覆盖率不低于 90%。
- 兼容性: 不修改 `contracts/PrivateBank.sol`、`contracts/EthRedPacket.sol` 任何一行；不影响两者现有的 Remix 直接复制部署流程。
- 代码风格: NatSpec 注释（`@title`/`@notice`/`@dev`），中文行内注释说明状态变量/事件/mapping 用途，与现有两个合约风格保持一致（`.claude/rules/coding-style.md`）。

## 依赖

- OpenZeppelin Contracts（通过 `forge install` 引入，具体版本在 design.md 中记录）
- Foundry（本机已安装，`forge --version` 确认可用）

## 开放问题

- 无（本 feature 所有技术选型已在用户指令中明确：Foundry、Solidity 0.8.24、OpenZeppelin、分离合约架构、SafeERC20、自定义 error）。
