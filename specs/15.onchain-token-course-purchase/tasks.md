# onchain-token-course-purchase — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-20 | v1 | 初始任务 |

## 项目信息

- 项目名: web3-university
- 架构类型: 单体仓库
- specs 路径: specs/15.onchain-token-course-purchase/

## 任务列表

### 功能 1：余额与 Faucet

- [ ] T-001: `lib/purchase/useOnchainBalance.ts` + `useWallet.tsx` 改造（`ydBalance` 只读来自链上，暴露 `refetchYdBalance`，移除 `setYdBalance`） ~30min
- [ ] T-002: `lib/purchase/useFaucetClaim.ts`；`PurchasePanel.tsx` 的"insufficient-balance"分支接入真实 `claim()` ~20min

### 功能 2：两阶段购买

- [ ] T-003: `lib/contracts/courseIdMap.ts`（slug↔courseId 固定映射） ~10min
- [ ] T-004: `usePurchaseFlow.ts` 改造：`allowance`/`hasPurchased` 链上读取，`approve()`/`buy()` 走 `walletClient.writeContract` + `waitForTransactionReceipt`，`state` 派生改为纯函数 ~40min

### 功能 3：购买记录展示

- [ ] T-005: `lib/purchase/useOnchainPurchases.ts`（个人中心已购课程/购买记录 Tab 用）；删除 `lib/mock/purchaseStore.ts` 及其全部调用点，改接链上读取 ~30min
- [ ] T-006: `LearningCenter.tsx` 购课门禁改用链上 `hasPurchased` ~15min

### 集成与测试

- [ ] T-007: 浏览器端到端联调：Faucet 领取 → 余额变化 → approve → buyCourse → 个人中心/学习中心状态同步刷新，全程用真实 Anvil 本地链验证（不使用 Mock 兜底），`npm run lint`/`npx tsc --noEmit`/`npm run build` 全绿 ~30min

## 依赖关系

- 全部任务依赖 [[14.contract-client-foundation]] 已完成
- T-002 依赖 T-001（Faucet 领取后要能刷新余额）
- T-004 依赖 T-003
- T-006 依赖 T-005
- T-007 依赖 T-001~T-006 全部完成

## 风险点

- `usePurchaseFlow` 现有 Mock 实现里有"操作发起后前置条件失效则放弃"的 ref 校验模式（见 `specs/memory/mock-async-revalidate-prereqs.md`），改造成真实链上交易后，交易确认需要的时间和失败模式（RPC 错误、用户拒签、revert）与 `setTimeout` 完全不同，必须重新设计这部分校验逻辑，不能照搬 Mock 版本的实现细节，只保留"完成时重新校验前置条件"这个原则。
- `lib/mock/purchaseStore.ts` 被三个消费点引用（`usePurchaseFlow.ts`/`useProfilePurchases.ts`/`LearningCenter.tsx`），删除前必须确认三处都已经切换到链上读取，不能只改一处导致混用两套数据源。
- 账户切换（Privy 换绑/换登录账户）后，`useOnchainBalance`/`useOnchainPurchases` 的 `useEffect` 依赖必须包含 `address`，否则会展示前一个账户的缓存数据（同类问题在 [[10.wallet-auth-integration]] 的 Mock 购买记录账户隔离修复中出现过，见 `specs/memory/`）。
