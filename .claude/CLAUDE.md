# Web3 University

Web3 在线课程 DApp：链上 YD Token 支付 + NFT 课程证书，链下承载视频/评论/进度。仓库根目录是 Next.js 前端（已实现 Stitch 设计稿全部 7 个页面的静态 UI + Mock 交互），`contracts/` 下另有一组与前端无业务关联的 Solidity 教学示例合约。

## 技术栈

- 前端: Next.js 16（App Router）+ TypeScript + React 19 + Tailwind CSS v4（CSS-first `@theme`，无 `tailwind.config.ts`）+ lucide-react
- 数据层: 全部前端 Mock（`lib/mock/`），无后端/数据库；购买记录等状态用 `localStorage` 模拟持久化
- 智能合约: Solidity `^0.8.24`（`contracts/` 下为 Remix 教学示例，尚无 Foundry/Hardhat 工程，与前端无关联）
- 包管理: npm

## 当前阶段范围（重要）

- 只实现 Stitch 设计稿对应的静态 UI 和 Mock 交互（本地假数据 / `useState` / `localStorage`）。
- 当前阶段允许接入 Privy Email 登录和 Ethereum 嵌入式钱包；YD 余额、Faucet、课程支付及其他链上业务继续使用 Mock。仅 Email 登录，不接外部钱包/MetaMask/WalletConnect。**不**接入数据库（Supabase）、**不**接入真实智能合约调用（YD Token、课程购买、证书铸造等合约）。
- PRD（`docs/PRD.md`）描述的是完整目标产品形态，用于理解业务背景，不代表本阶段要实现的范围。
- 现有 `contracts/` 下的 Solidity 示例合约（`PrivateBank.sol`、`EthRedPacket.sol`）保持不变，禁止删除或修改。

## 常用命令

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint      # eslint .
```

合约暂无 Foundry/Hardhat 工程，可直接复制到 [Remix](https://remix.ethereum.org/) 编译部署（见 `README.md`）。

## 目录结构

```
.
├── app/                 # Next.js App Router 页面（/、/courses、/learn、/profile、/teacher、/admin）
├── components/          # 按页面/功能分目录（home/marketplace/course-detail/learning-center/profile/teacher/admin/layout）
├── lib/
│   ├── mock/             # 各 feature 的 Mock 数据与 fixtures
│   ├── wallet/            # 真实身份层：useWallet（Privy Email 登录 + Ethereum 嵌入式钱包）
│   └── purchase/           # 购买/进度相关共享 Hook
├── contracts/            # Solidity 教学示例合约（只读，勿改）
│   ├── PrivateBank.sol
│   └── EthRedPacket.sol
├── docs/
│   └── PRD.md             # 完整产品需求文档（目标态，非本阶段范围）
├── specs/                # /yd:ai 开发规格：requirements/design/tasks + LESSONS.md + memory/
└── README.md              # 前端快速开始 + 合约 Remix 演示步骤
```

## 规则

@rules/coding-style.md
@rules/testing.md
@rules/security.md
@rules/git-workflow.md
@rules/frontend.md
@rules/smart-contract.md
