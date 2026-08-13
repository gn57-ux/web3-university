# 课程详情与模拟购买 — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-12 | v1 | 初始设计 |

## 项目架构

- 架构类型: 单体仓库，Next.js App Router
- 涉及层: 仅前端（`app/courses/[courseId]/page.tsx` 及其子组件）

## Stitch 设计稿依据

通过 Stitch MCP 读取项目 `projects/8237832631308458514`，页面 `课程详情 - Solidity 入门`（`screens/4f01e068708a4d25986a428252b1b5a3`）得到的结构：

- **课程标题区**：标题「Solidity 智能合约入门」、讲师「Dr. Alex Wei, Lead Smart Contract Auditor」、难度徽标「Beginner Smart Contracts」。
- **课程简介**：融合 EVM 理论与实践编码的入门介绍文案。
- **课程大纲**：5 个模块——以太坊与 EVM 简介 / Solidity 基础：类型与变量 / 函数与修饰符 / 高级模式：接口与继承 / 安全 101：重入与溢出，每项可展开查看详情。
- **学员评价**：2 条五星好评，强调课程深度与实用性。
- **购买区**：价格 4 YD（永久访问）、要求钱包余额 20 YD、权益列表（视频访问/编码练习/链上证书 SBT/社区访问）、两阶段购买（Approve/Buy）、安全提示"Secured by Sepolia Smart Contracts"。
- **页脚**：复用 `Footer`。

> 实现阶段须再次通过 Stitch MCP 读取原始设计稿确认购买面板的具体状态视觉（颜色/图标/文案），不得仅凭本文档摘要还原。

## 功能模块设计

### 模块 1: 课程详情内容区

`components/course-detail/CourseHeader.tsx`、`CourseCurriculum.tsx`（可展开模块列表，使用 `useState<Set<string>>` 记录展开项）、`CourseReviews.tsx`。数据来自 `lib/mock/courseDetails.ts`（按 `courseId` 查找详情 fixtures，与 feature 3 的课程列表通过 `id` 字段对应但各自维护独立 fixtures 文件，避免强耦合）。

### 模块 2: 购买状态机

`lib/purchase/usePurchaseFlow.ts`：一个有限状态机 Hook，状态枚举：

```ts
type PurchaseState =
  | "wallet-disconnected"
  | "wrong-network"
  | "insufficient-balance"
  | "needs-approval"
  | "approving"
  | "ready-to-buy"
  | "buying"
  | "purchased"
```

状态推导逻辑：「是否已购买」用 `useSyncExternalStore(subscribePurchases, () => getPurchases().some(...), () => false)` 读取（**实现阶段对原方案的技术调整**：最初设计是 `useState(false)` + `useEffect` 里 `setState` 恢复，但 `eslint-plugin-react-hooks` 的 `set-state-in-effect` 规则会拒绝"在 effect 内直接同步 setState"这一写法，其官方推荐替代方案正是 `useSyncExternalStore`——它专为"读取外部可变状态（如 localStorage）且需要 SSR 安全的初始值"设计）。`getServerSnapshot` 恒返回 `false`，服务端渲染与客户端首次渲染结果一致，不产生 hydration mismatch；`purchaseStore.ts` 内维护一个订阅者集合，`recordPurchase()` 写入成功后调用 `notifyListeners()`，`useSyncExternalStore` 会据此自动重新渲染为 `purchased` 态，**不需要**在 `buy()` 里手动 `setIsPurchased(true)`。相比原方案，不再需要额外的 `isRestoringPurchase` 骨架态标志——`useSyncExternalStore` 的 hydration 后自动重渲染发生得足够快，不需要手动管理"恢复中"这一中间态。

状态推导除「是否已购买」「是否已授权」外，还需两个独立的**瞬时动作**布尔值 `isApproving`、`isBuying`（点击对应按钮后置 `true`，Mock 异步 `setTimeout` 结束后置回 `false` 并翻转 `isApproved`/`purchased`）。

**等待期间前置条件失效的处理**：`approve()`/`buy()` 发起时会闭包捕获当时的 `state`，但 `setTimeout` 真正触发时（800-1500ms 之后）钱包可能已被用户从 `TopNav` 断开、切换到错误网络或余额被清零。因此 `setTimeout` 回调**不能**无条件地 `setIsApproved(true)`/`recordPurchase(...)`，必须先通过一个持续同步最新 `wallet.connected`/`wallet.network`/`wallet.ydBalance`/`requiredBalanceYD` 的 `ref`（在 `useEffect` 里随每次渲染更新）重新校验前置条件；条件已失效则放弃本次操作（不写入购买记录、不置位 `isApproved`），让派生状态自然回落到当前真实前置条件对应的态（如 `wallet-disconnected`）。绝不能让一笔发起时合法、完成时钱包已失效的交易被静默记为成功。

优先级推导为**三段式**，瞬时动作态必须排在其对应的稳定态之前判断，否则点击按钮后的 loading 反馈永远不可达（因为 `isApproving`/`isBuying` 为 `true` 时，`isApproved`/`purchased` 仍分别是 `false`/未变化，若先判断稳定态会把瞬时态"吃掉"）：

1. **是否已购买**为 `true` → 直接短路为 `purchased` 态，不再考察钱包连接/网络/余额等前置条件（已购买用户即使后续断开钱包、切换错误网络或花光 YD 余额，仍应保留"开始学习"入口，不得被降级回未购买前置状态）。
2. 否则依次检查钱包前置条件：未连接 > 错误网络 > 余额不足。
3. 前置条件均满足后，**先查瞬时动作态，再查稳定态**：`isBuying` → `buying`；否则 `isApproved && !isBuying` → `ready-to-buy`；否则 `isApproving` → `approving`；否则（`!isApproved && !isApproving`）→ `needs-approval`。

完整优先级顺序：**已购买(`purchased`) > 未连接 > 错误网络 > 余额不足 > 购买中(`isBuying`) > 待购买(`isApproved` 且非购买中) > 授权中(`isApproving`) > 未授权(其余情况)**。

`components/course-detail/PurchasePanel.tsx`：根据 `PurchaseState` 渲染对应文案与按钮，按钮点击触发 Mock 异步流程（`setTimeout` 模拟 800-1500ms 等待），依次将「未授权→授权中→已授权（待购买）」「待购买→购买中→已购买」推进。**`insufficient-balance` 态必须渲染一个真实可点击的「Mock 领取 {requiredBalanceYD} YD（Faucet）」按钮**，`onClick` 调用 `wallet.setYdBalance(requiredBalanceYD)`（见 F-008）——否则默认 Mock 余额（16 YD，来自 feature 1 `mockCurrentUser`）低于本课程所需（20 YD），用户将永远卡在余额不足态，无法通过页面本身走通完整购买链路。

### 模块 3: 两阶段交易按钮组件

`components/course-detail/TwoPhaseTxButton.tsx`：根据设计系统「Transaction Button (Two-step)」规范实现——授权完成时以宽度过渡动画（Tailwind `transition-all`）从「Phase 1: Approve」变为「Phase 2: Purchase」，完成态使用 `secondary`（薄荷绿）对勾图标（Lucide `Check`）。

### 模块 4: 购买记录写入共享 Mock Store

购买成功后，调用 `lib/mock/purchaseStore.ts` 提供的 `recordPurchase(courseId, courseName, priceYD)` 方法，将记录（含 `courseName`）写入 `localStorage`（key 如 `mock_purchases`）。`purchaseStore.ts` 同时导出 `subscribePurchases(listener)`（用于 `useSyncExternalStore`，见模块 2）：内部维护一个 tab 内订阅者集合并在写入后 `notify`，同时监听浏览器原生 `storage` 事件以支持跨 tab 同步。该 Store 是可选的跨 feature 集成点：feature 5（学习中心）、feature 6（个人中心）可选择用同样的 `useSyncExternalStore(subscribePurchases, ...)` 模式读取此记录来判断"是否已购买"及渲染课程名，但均需自带默认 fixtures，不强制依赖此写入才能渲染。

**涉及层及关键设计:**

- 全部为客户端组件与纯前端状态机，无服务端/接口/合约交互。

## 接口契约

无。

## 数据模型

```ts
interface CourseDetail extends Course {
  description: string
  curriculum: { id: string; title: string; summary: string }[]
  reviews: { author: string; rating: number; comment: string }[]
  requiredBalanceYD: number
}

interface MockPurchaseRecord {
  courseId: string
  courseName: string // 冗余存储课程名，避免消费方（如 feature 6）需要额外的 id→课程查找表
  priceYD: number
  purchasedAt: string
  txHash: string // Mock 生成的假哈希，如 `0xmock...${randomHex}`
}
```

## 安全考虑

- 严禁引入任何真实钱包连接、合约 ABI 调用或链上交易签名代码；`txHash` 等字段均为前端拼接的假数据，需在代码注释或变量命名中明确标注 `mock`，避免后续被误当作真实链上数据使用。
- 遵循 `.claude/rules/security.md`：不写入任何真实密钥或 RPC 配置。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 状态机实现 | 自定义 Hook + `useState`/`useReducer`，不引入 XState 等状态机库 | 状态数量有限（8 种），手写 Hook 足够清晰，避免引入额外依赖 |
| 购买记录持久化 | `localStorage` | 需要在页面刷新/跳转后仍可被个人中心等页面读取，但又不希望引入真实数据库，`localStorage` 是最小可行方案 |
