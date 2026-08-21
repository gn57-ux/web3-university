# contract-client-foundation — 需求规格

## 概述

搭建前端接入真实智能合约（[[11.yd-token-faucet]]/[[12.course-marketplace-contract]]/[[13.course-certificate-completion]]）所需的基础设施：本地 Anvil 链、ABI 同步、合约地址管理、Viem 客户端、Privy 钱包客户端签名能力、统一的链上错误/交易状态模型。本 feature 不替换任何现有 Mock 业务逻辑（YD 余额/购买/完课），只搭地基；[[15.onchain-token-course-purchase]]、[[16.onchain-completion-certificate]] 在此基础上替换具体业务。

## 项目信息

- 项目名: web3-university
- 架构类型: 单体仓库（Next.js 前端 + `contracts/web3-university/` Foundry 子工程）

## 需求版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-20 | v1 | 初始需求 |

## 用户故事

- 作为开发者，我想要一条本地可复现的链（Anvil）+ 一次部署脚本，就能在本机跑通全部真实合约调用，不依赖 Sepolia 或任何外部密钥。
- 作为开发者，我想要前端能直接拿到合约 ABI 和地址，不用手工复制粘贴，也不用在每台机器上都装 Foundry 才能 `npm run build`。
- 作为用户，我想要在任何链上操作（领取/授权/购买/确认完成）时看到统一、清晰的阶段提示和错误文案，而不是每个页面各写一套。

## 功能需求

1. [F-001] 本地 Anvil 链作为当前阶段唯一的链上目标（`chainId=31337`），viem 自定义 `Chain` 定义集中在 `lib/contracts/chain.ts`；预留后续切换到 Sepolia 只需改这一处配置，不在本 feature 内实现 Sepolia 切换。
2. [F-002] ABI 同步：`scripts/sync-contract-abis.mjs`（`npm run contracts:sync-abi`）从 `contracts/web3-university/out/` 提取 5 个合约（`YDToken`/`YDFaucet`/`Web3University`/`CourseCertificate`/`DemoCompletionOracle`）的 ABI，写入 `lib/contracts/abis/*.ts`（`as const` 导出，供 viem 类型推断），**产物提交到仓库**（前端 `npm run build` 不应依赖本机装有 Foundry）。
3. [F-003] 合约地址：`lib/contracts/addresses.ts` 按 `chainId` 索引 5 个合约地址；`scripts/sync-contract-addresses.mjs`（`npm run contracts:sync-addresses`）从 Foundry 部署脚本的广播产物（`broadcast/DeployAll.s.sol/31337/run-latest.json`）自动提取并写入，不手工誊抄。
4. [F-004] Viem 客户端：`lib/contracts/publicClient.ts`（只读，指向本地 Anvil RPC）与一个基于 Privy 嵌入式钱包 EIP-1193 provider 包装出的 `walletClient`（用于签名/发交易），二者通过新增的 `lib/contracts/useContractClients.ts` Hook 暴露，不与身份/登录状态耦合在 `useWallet.tsx` 里（职责分离：`useWallet` 只管身份，合约客户端是新的独立关注点）。
5. [F-005] `useWallet.tsx` 的网络检测从"是否是 Sepolia"改为"是否是 `TARGET_CHAIN`（当前为本地 Anvil）"；`switchToSepolia()` 重命名为 `switchToTargetChain()`（原名不再准确，且是破坏性但必要的重命名），`TopNav.tsx`/`PurchasePanel.tsx` 的按钮文案与调用同步更新。
6. [F-006] 统一链上错误映射：`lib/contracts/txError.ts` 把 viem 的常见错误（用户拒签、余额不足、合约 revert 自定义 error、RPC/网络错误）转成中文用户提示，复用/对齐 `useWallet.tsx` 已有的 `toErrorMessage()` 风格，不在各消费点各写一套判断。
7. [F-007] 统一交易状态：`TxStatus`（`"idle" | "signing" | "pending" | "success" | "error"`）类型与展示交易哈希的约定，供 [[15.onchain-token-course-purchase]]、[[16.onchain-completion-certificate]] 的具体业务 Hook 复用，满足 PRD 11.2"所有链上操作均显示当前阶段和交易哈希"。
8. [F-008] 部署与联调脚本：扩展 [[13.course-certificate-completion]] 的 `script/DeployAll.s.sol` 为可 `--broadcast` 到本地 Anvil 的版本（或新增变体），配合一个课程种子脚本（老师白名单、创建/审核/上架 `lib/mock/fixtures.ts` 中的课程，`metadataURI` 存课程 slug，保证链上 `courseId` 与前端 slug 可预测映射），部署+种子完成后前端 `publicClient` 能读到真实链上状态。

## 非功能需求

- 安全: 不出现任何真实私钥、Sepolia/主网 RPC URL；Anvil 默认助记词派生的测试账户仅用于本地链，不代表任何真实资产。
- 兼容性: 不改变 [[10.wallet-auth-integration]] 已交付的登录门禁、`connected`/`address`/`authError`/`loading` 等字段行为；只重命名 `switchToSepolia`→`switchToTargetChain` 并更新其内部判定逻辑。
- 可复现性: 全新 clone 仓库后，`npm install` + `forge build`（子工程）+ `npm run contracts:sync-abi` + 启动 Anvil + 部署脚本，应能得到与文档描述一致的可用本地环境，不依赖任何未记录的手工步骤。

## 依赖

- [[11.yd-token-faucet]]、[[12.course-marketplace-contract]]、[[13.course-certificate-completion]] 已完成的合约
- [[10.wallet-auth-integration]] 已交付的 `useWallet.tsx`
- Foundry（本机已装）、`viem`（已是前端依赖）

## 开放问题

- 无（技术选型已由本次用户指令明确：Anvil、ABI、合约地址、Viem、Privy wallet client、统一错误和交易状态）。
