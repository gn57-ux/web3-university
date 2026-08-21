# Web3 University

Web3 在线课程 DApp：链上 YD Token 支付 + NFT 课程证书，链下承载视频/评论/进度。仓库根目录是 Next.js 前端（Stitch 设计稿全部 7 个页面 UI 已实现；课程购买/完课确认/证书展示已接入真实本地 Anvil 合约调用，其余业务仍是 Mock 交互），`contracts/web3-university/` 是独立 Foundry 工程（YDToken/YDFaucet/Web3University/CourseCertificate/DemoCompletionOracle 合约 MVP，前端已通过 `lib/contracts/`/`lib/purchase/` 接入本地 Anvil 部署），`contracts/*.sol` 另有一组与两者均无业务关联的 Solidity 教学示例合约。

## 技术栈

- 前端: Next.js 16（App Router）+ TypeScript + React 19 + Tailwind CSS v4（CSS-first `@theme`，无 `tailwind.config.ts`）+ lucide-react
- 数据层: 课程购买/YD 余额/Faucet/完课确认/NFT 证书已改为真实读写本地 Anvil 合约（`lib/contracts/`、`lib/purchase/`），完课确认经 `app/api/complete-course/` 服务端 Route Handler 转发；其余业务仍是前端 Mock（`lib/mock/`），无数据库
- 智能合约（MVP）: Solidity `0.8.24` + Foundry + OpenZeppelin，`contracts/web3-university/`，分离合约架构，见 `specs/11.yd-token-faucet/design.md`
- 智能合约（教学示例）: Solidity `^0.8.24`（`contracts/*.sol`，Remix 教学示例，尚无 Foundry/Hardhat 工程，与上述 MVP 及前端均无关联）
- 包管理: npm

## 当前阶段范围（重要）

- Stitch 设计稿对应的 UI 已全部实现；课程购买/YD 余额/Faucet/完课确认/NFT 证书已接入真实本地 Anvil 合约调用（Features 14–16），其余交互（视频播放、评论、老师/管理后台等）仍是 Mock（本地假数据 / `useState` / `localStorage`）。
- 已接入 Privy Email 登录和 Ethereum 嵌入式钱包。仅 Email 登录，不接外部钱包/MetaMask/WalletConnect。**不**接入数据库（Supabase）。
- `contracts/web3-university/` 智能合约 MVP 已完成（`docs/PRD.md` 里程碑一「合约闭环」），前端已通过 `lib/contracts/`（Viem 客户端/ABI/地址）+ `lib/purchase/`（业务 Hook）接入，目前只对接本地 Anvil（`lib/contracts/chain.ts` 的 `TARGET_CHAIN`），Sepolia 部署仍是后续里程碑。
- PRD（`docs/PRD.md`）描述的是完整目标产品形态，用于理解业务背景，不代表本阶段要实现的范围。
- 现有 `contracts/PrivateBank.sol`、`contracts/EthRedPacket.sol` 保持不变，禁止删除或修改。

## 常用命令

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint      # eslint .
```

```bash
cd contracts/web3-university
forge install OpenZeppelin/openzeppelin-contracts@v5.7.0 --no-git
forge install foundry-rs/forge-std@v1.9.7 --no-git
forge build
forge test
```

前端接入本地合约需要先起 Anvil 再部署+同步地址（`TRUSTED_SUBMITTER_PRIVATE_KEY` 见 `.env.example`，`.env.local` 配置本地测试私钥）：

```bash
anvil --host 127.0.0.1 --port 8545 --gas-price 0 --block-base-fee-per-gas 0 --disable-min-priority-fee
npm run contracts:deploy-local   # 部署+接线+种子课程，自动同步 lib/contracts/addresses.ts
```

`contracts/PrivateBank.sol`、`contracts/EthRedPacket.sol` 无 Foundry/Hardhat 工程，可直接复制到 [Remix](https://remix.ethereum.org/) 编译部署（见 `README.md`）。

## 目录结构

```
.
├── app/                 # Next.js App Router 页面（/、/courses、/learn、/profile、/teacher、/admin）+ app/api/complete-course（完课确认服务端路由）
├── components/          # 按页面/功能分目录（home/marketplace/course-detail/learning-center/profile/teacher/admin/layout）
├── lib/
│   ├── mock/             # 各 feature 的 Mock 数据与 fixtures
│   ├── wallet/            # 真实身份层：useWallet（Privy Email 登录 + Ethereum 嵌入式钱包）+ 共享 YD 余额状态
│   ├── contracts/          # Viem 客户端（useContractClients）、合约地址/ABI（`npm run contracts:sync-*` 生成）、统一交易错误映射（txError.ts）、courseIdMap
│   └── purchase/           # 购买/Faucet/完课确认/证书查询等业务 Hook，均读写本地 Anvil 真实合约（账户切换/查询键竞态已处理）
├── contracts/
│   ├── web3-university/    # 智能合约 MVP（Foundry，独立工程，前端已接入本地 Anvil 部署）
│   │   ├── src/              # YDToken/YDFaucet/Web3University/CourseCertificate/DemoCompletionOracle
│   │   ├── test/              # forge test，5 个合约均 100% 行覆盖率
│   │   └── script/             # DeployAllLocal.s.sol：本地 Anvil 一键部署+接线+种子课程，仅本地测试私钥，无真实 RPC
│   ├── PrivateBank.sol     # Solidity 教学示例合约（只读，勿改）
│   └── EthRedPacket.sol    # 同上
├── docs/
│   └── PRD.md             # 完整产品需求文档（目标态，非本阶段范围）
├── specs/                # /yd:ai 开发规格：requirements/design/tasks + LESSONS.md + memory/
└── README.md              # 前端快速开始 + 合约 MVP 快速开始 + 合约 Remix 演示步骤
```

## 规则

@rules/coding-style.md
@rules/testing.md
@rules/security.md
@rules/git-workflow.md
@rules/frontend.md
@rules/smart-contract.md
