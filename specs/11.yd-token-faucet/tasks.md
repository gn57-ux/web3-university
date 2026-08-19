# yd-token-faucet — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-19 | v1 | 初始任务 |

## 项目信息

- 项目名: web3-university
- 架构类型: 单体仓库（新增 Foundry 子工程）
- specs 路径: specs/11.yd-token-faucet/

## 任务列表

### 功能 1：Foundry 工程骨架

- [x] T-001: `forge init contracts/web3-university`（或等效手动搭建），安装 OpenZeppelin Contracts，配置 `foundry.toml`（solc 0.8.24、优化器、fmt）与 `remappings.txt`；`forge build` 在空模板下跑通 ~30min

### 功能 2：YDToken

- [x] T-002: 实现 `src/YDToken.sol`（OZ `ERC20`，构造函数铸造初始供应量，不提供 `mint()`）+ `test/YDToken.t.sol`（供应量/decimals/name/symbol/标准转账授权行为） ~30min

### 功能 3：YDFaucet

- [x] T-003: 实现 `src/YDFaucet.sol`（`claim()` 限领 20 YD、`fund()` onlyOwner 用 `SafeERC20`、自定义 error、`TokensClaimed`/`FaucetFunded` 事件） ~30min
- [x] T-004: `test/YDFaucet.t.sol`：首次领取成功、重复领取 revert、余额不足 revert、非 Owner `fund` revert、Owner `fund` 成功、领取地址的 fuzz 测试 ~30min

### 集成与测试

- [x] T-005: `script/DeployTokenFaucet.s.sol`（本地 dry-run 部署脚本，无私钥/RPC/broadcast），`forge script` 本地验证部署流程可行 ~15min
- [x] T-006: `forge coverage` 确认 `YDToken.sol`/`YDFaucet.sol` 行覆盖率 ≥ 90%；`forge fmt --check`、`forge build` 全绿 ~15min

## 依赖关系

- T-002、T-003 依赖 T-001（需要工程骨架才能编译）
- T-004 依赖 T-003
- T-005 依赖 T-002、T-003（部署脚本需要两个合约都已实现）
- T-006 依赖 T-002~T-005 全部完成
- 本 feature 是 12、13 两个合约 feature 的前置依赖（12 需要 `YDToken` 地址用于支付；13 需要本 feature 建立的 Foundry 工程骨架）

## 风险点

- OpenZeppelin 版本需与 Solidity `0.8.24` 兼容，`forge install` 时确认拉取的 release tag 支持该编译器版本，避免后续 12/13 两个 feature 因版本不一致产生依赖冲突。
- `contracts/web3-university/` 是全新目录，需在 T-001 完成后立即确认不影响 `contracts/PrivateBank.sol`、`contracts/EthRedPacket.sol` 的 Remix 直接复制部署流程（两文件路径、内容均不改动）。
- 部署脚本（T-005）容易被误用为"顺手做一次真实部署"，必须在实现和验证阶段都确认没有 `--broadcast`、没有硬编码/读取任何 RPC URL 或私钥。
