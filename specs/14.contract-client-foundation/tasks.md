# contract-client-foundation — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-20 | v1 | 初始任务 |

## 项目信息

- 项目名: web3-university
- 架构类型: 单体仓库
- specs 路径: specs/14.contract-client-foundation/

## 任务列表

### 功能 1：链定义与部署种子脚本

- [x] T-001: `lib/contracts/chain.ts`（`TARGET_CHAIN` viem 自定义链定义，Anvil Local）；扩展合约侧部署脚本为可广播到本地 Anvil 的变体（含课程种子：白名单老师、按 `mockCourses` 顺序创建/审核/上架 3 门课程，`metadataURI` 存 slug） ~30min

### 功能 2：ABI/地址同步

- [x] T-002: `scripts/sync-contract-abis.mjs` + `npm run contracts:sync-abi`，生成 `lib/contracts/abis/*.ts`（5 个合约） ~20min
- [x] T-003: `scripts/sync-contract-addresses.mjs` + `npm run contracts:sync-addresses`，解析 Foundry broadcast 产物生成 `lib/contracts/addresses.ts` ~20min

### 功能 3：Viem 客户端与错误/状态模型

- [x] T-004: `lib/contracts/useContractClients.ts`（`publicClient`/`walletClient`，基于 Privy 嵌入式钱包 provider） ~20min
- [x] T-005: `lib/contracts/txError.ts`（`TxStatus` 类型 + `toContractErrorMessage()`） ~15min

### 功能 4：useWallet 网络改造与联调

- [x] T-006: `useWallet.tsx`：`WalletNetwork` 改为 `"correct" | "wrong-network" | null`，网络判定改用 `TARGET_CHAIN`，`switchToSepolia`→`switchToTargetChain`；`PrivyProvider` 的 `defaultChain`/`supportedChains` 改为 `TARGET_CHAIN`；同步更新 `TopNav.tsx`/`PurchasePanel.tsx` 的调用与文案 ~30min
- [x] T-007: 联调验证：启动 Anvil → 运行部署+种子脚本 → `npm run contracts:sync-abi && npm run contracts:sync-addresses` → 前端 `publicClient.readContract` 能读到 `YDToken.name()`/`Web3University.courses(1)` 等真实链上数据（写一个临时验证脚本或在浏览器 QA 中确认，不需要正式测试框架） ~20min

## 依赖关系

- T-002、T-003 依赖 [[13.course-certificate-completion]] 已完成的合约（需要 `forge build` 产物和部署脚本）
- T-001 依赖 [[13.course-certificate-completion]] 的 `DeployAll.s.sol`
- T-004 依赖 T-001（需要 `TARGET_CHAIN`）
- T-006 依赖 T-001、T-004
- T-007 依赖 T-001~T-006 全部完成
- 本 feature 是 [[15.onchain-token-course-purchase]]、[[16.onchain-completion-certificate]] 的前置依赖

## 风险点

- Anvil 地址的确定性依赖"固定助记词 + 固定部署顺序"，部署脚本的合约创建顺序一旦改变（如插入新的部署步骤），已提交的 `addresses.ts` 会失效，必须重新运行同步脚本，不能假设地址永远不变。
- `switchToSepolia`→`switchToTargetChain` 是全仓库范围的重命名，必须逐一确认 `TopNav.tsx`/`PurchasePanel.tsx`/以及未来 15/16 新增的消费点都用新名字，不能遗留旧名字导致编译失败或语义不一致。
- `walletClient` 的创建依赖 `embeddedWallet.getEthereumProvider()` 是异步调用，`useMemo` 直接 `await` 不合法，需要用 `useEffect` + `useState` 或等效模式处理异步初始化，不能想当然同步返回。
