# onchain-token-course-purchase — 需求规格

## 概述

用 [[14.contract-client-foundation]] 搭好的合约客户端，把 YD 余额、Faucet 领取、课程购买（授权+购买两阶段）从 Mock 状态机换成真实链上读写，替换 [[4.course-detail-mock-purchase]]/[[10.wallet-auth-integration]] 交付的 `usePurchaseFlow`/`useWallet.ydBalance` 相关 Mock 逻辑。购买记录来自链上 `Web3University.purchaseOf`，不再写 `localStorage`。

## 项目信息

- 项目名: web3-university
- 架构类型: 单体仓库

## 需求版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-20 | v1 | 初始需求 |

## 用户故事

- 作为学生，我想要点击"领取 YD"后看到我的真实链上余额增加，而不是一个假数字。
- 作为学生，我想要购买课程时先授权、再购买，两笔都是真实链上交易，能看到每一步的交易哈希和状态。
- 作为学生，我想要个人中心/课程详情看到的"是否已购买"来自链上真实记录，刷新页面、换设备登录同一账户都能看到一致的状态。

## 功能需求

1. [F-001] `ydBalance` 改为 `publicClient.readContract` 读取 `YDToken.balanceOf(address)` 的真实值，替换 `useWallet.tsx` 里的本地 `useState`；`setYdBalance()` 这个"Mock 兜底改余额"的接口被移除（不再需要，因为余额只能通过真实链上操作改变）。
2. [F-002] Faucet 领取：`useFaucetClaim()`（或等效 Hook）调用 `YDFaucet.claim()`，替换 `PurchasePanel.tsx` 里"Mock 领取"按钮的行为；已领取过时展示合约返回的 `AlreadyClaimed` 错误对应的中文提示。
3. [F-003] 两阶段购买：`usePurchaseFlow` 的 `approve()` 改为调用 `YDToken.approve(web3UniversityAddress, price)`，`buy()` 改为调用 `Web3University.buyCourse(courseId)`；`courseId` 通过 [[14.contract-client-foundation]] 建立的 slug↔courseId 映射从课程 slug 解析。
4. [F-004] 购买状态派生：`state`（`needs-approval`/`approving`/`ready-to-buy`/`buying`/`purchased`）改为读取真实链上状态（`allowance`/`hasPurchased`）而不是本地 `useState` 假装的中间态；交易发送后到确认前的等待期展示 `TxStatus`（`signing`/`pending`），确认后重新读链上状态推导下一步。
5. [F-005] 购买记录展示（课程详情购买信息、个人中心"已购课程"/"购买记录" Tab）改为读取 `Web3University.purchaseOf(courseId, student)`，替代 `lib/mock/purchaseStore.ts` 的 `localStorage` 实现；个人中心需要展示"我购买过的所有课程"，通过已知的 3 门种子课程 `courseId`（1/2/3）分别查询 `hasPurchased`/`purchaseOf` 并过滤（MVP 阶段课程数量已知且固定，不引入事件索引器）。
6. [F-006] 错误处理：钱包余额不足、授权额度不足、用户拒签、网络错误等场景，使用 [[14.contract-client-foundation]] 的 `toContractErrorMessage()` 统一转中文提示，不允许把交易失败误判为成功、也不允许把待确认状态误判为最终状态。
7. [F-007] 移除范围：`lib/mock/purchaseStore.ts` 及其在 `usePurchaseFlow.ts`/`useProfilePurchases.ts`/`LearningCenter.tsx` 中的调用点全部替换为链上读取；`lib/mock/fixtures.ts` 里的 `mockCurrentUser.ydBalance` 字段不再作为余额初值来源（改为链上读取后的实际值）。

## 非功能需求

- 一致性: 同一学生用同一账户从不同页面（课程详情/学习中心/个人中心）看到的购买状态、余额必须完全一致（因为现在是同一个链上真实来源，不再需要人工保证"多处 Mock 数据同步"）。
- 安全: 不在前端硬编码/展示任何私钥；所有写操作都通过 Privy 嵌入式钱包签名，用户能在 Privy 的确认界面看到实际要签的交易。
- 兼容性: 未购买/未登录/错误网络等前置状态判断逻辑（`state` 机器的前几档）沿用 [[10.wallet-auth-integration]] 已交付的 `wallet.connected`/`wallet.network` 判断，只替换"已连接且网络正确"之后的链上数据来源。

## 依赖

- [[14.contract-client-foundation]] 的 `publicClient`/`walletClient`/ABI/地址/`TxStatus`
- [[11.yd-token-faucet]]、[[12.course-marketplace-contract]] 的合约接口

## 开放问题

- 无（业务逻辑与技术选型已在用户指令和既有 Mock 状态机设计中明确，本次只是把数据来源从 Mock 换成链上）。
