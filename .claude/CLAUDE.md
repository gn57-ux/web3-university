# Web3 University

Web3 在线课程 DApp：链上 YD Token 支付 + NFT 课程证书，链下承载视频/评论/进度。当前仓库包含教学用 Solidity 示例合约，即将新增 Next.js + TypeScript + Tailwind CSS 前端。

## 技术栈

- 智能合约: Solidity `^0.8.24`（当前为 Remix 教学示例，尚无 Foundry/Hardhat 工程）
- 前端（新增）: Next.js、TypeScript、Tailwind CSS
- 包管理: npm（前端初始化后以 `package.json` 为准）

## 当前阶段范围（重要）

- 只实现 Stitch 设计稿对应的静态 UI 和 Mock 交互（本地假数据 / 内存状态）。
- **不**接入真实钱包（Privy/wagmi/viem）、**不**接入数据库（Supabase）、**不**接入真实智能合约调用。
- PRD（`docs/PRD.md`）描述的是完整目标产品形态，用于理解业务背景，不代表本阶段要实现的范围。
- 现有 `contracts/` 下的 Solidity 示例合约（`PrivateBank.sol`、`EthRedPacket.sol`）保持不变，禁止删除或修改。

## 常用命令

- 前端项目尚未创建，初始化后请在此处补充 `install / dev / build / lint` 命令。
- 合约暂无 Foundry/Hardhat 工程，可直接复制到 [Remix](https://remix.ethereum.org/) 编译部署（见 `README.md`）。

## 目录结构

```
.
├── contracts/          # Solidity 教学示例合约（只读，勿改）
│   ├── PrivateBank.sol
│   └── EthRedPacket.sol
├── docs/
│   └── PRD.md           # 完整产品需求文档（目标态，非本阶段范围）
├── README.md            # 合约 Remix 演示步骤
└── (待新增) frontend/ 或仓库根目录下的 Next.js 项目
```

## 规则

@rules/coding-style.md
@rules/testing.md
@rules/security.md
@rules/git-workflow.md
@rules/frontend.md
@rules/smart-contract.md
