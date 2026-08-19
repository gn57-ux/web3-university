# Web3 University 智能合约（Foundry）

MVP 合约闭环：`YDToken`（ERC-20）、`YDFaucet`（限领水龙头）、`Web3University`（课程市场）、`CourseCertificate`（ERC-721 证书）、`DemoCompletionOracle`（演示完课预言机）。分离合约架构，详见 `specs/11.yd-token-faucet/design.md`「架构决策」小节。

与仓库根目录 Next.js 前端、`contracts/PrivateBank.sol`/`contracts/EthRedPacket.sol`（Remix 教学示例，与本工程无关联，禁止修改）相互独立。

## 快速开始

```bash
cd contracts/web3-university

# 安装依赖（lib/ 不提交到仓库，按下方锁定版本安装，需要网络）
forge install OpenZeppelin/openzeppelin-contracts@v5.7.0 --no-git
forge install foundry-rs/forge-std@v1.9.7 --no-git

forge build
forge test
forge coverage --report summary
forge fmt --check
```

## 依赖版本锁定

| 依赖 | 版本/引用 |
| --- | --- |
| OpenZeppelin Contracts | `v5.7.0` |
| forge-std | `v1.9.7` |

## 部署脚本（仅本地模拟，禁止真实广播）

`script/` 下的部署脚本仅用于 `forge script <script>`（不带 `--broadcast`、不带指向真实网络的 `--rpc-url`）本地模拟验证部署流程，不包含任何真实私钥或 RPC 配置，不得用于 Sepolia 或主网部署。
