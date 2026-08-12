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

状态推导逻辑：「是否已购买」`useState` **必须初始化为 `false`**（与服务端渲染结果一致，避免 Next.js 的 hydration mismatch——`localStorage` 仅在浏览器可用，若直接用它计算初始值，服务端渲染出的 `false` 与客户端首次渲染可能出现的 `true` 会不一致）。真正的恢复逻辑放在 `useEffect(() => { ... }, [])` 中：组件挂载后（客户端 hydration 完成后）调用 `purchaseStore.getPurchases()` 按当前 `courseId` 查找是否已有记录，若存在则 `setIsPurchased(true)`。这意味着已购买用户在页面刷新时会有一瞬间（首次渲染）展示未购买态，随后在 effect 执行后立刻切换为 `purchased`；如需避免这一瞬间的视觉闪烁，可额外引入 `isRestoringPurchase`（初始 `true`，effect 执行完毕后置 `false`）在恢复完成前展示购买面板的骨架屏，而不是先展示错误的"未购买"文案。

状态推导除「是否已购买」「是否已授权」外，还需两个独立的**瞬时动作**布尔值 `isApproving`、`isBuying`（点击对应按钮后置 `true`，Mock 异步 `setTimeout` 结束后置回 `false` 并翻转 `isApproved`/`purchased`）。

优先级推导为**三段式**，瞬时动作态必须排在其对应的稳定态之前判断，否则点击按钮后的 loading 反馈永远不可达（因为 `isApproving`/`isBuying` 为 `true` 时，`isApproved`/`purchased` 仍分别是 `false`/未变化，若先判断稳定态会把瞬时态"吃掉"）：

1. **是否已购买**为 `true` → 直接短路为 `purchased` 态，不再考察钱包连接/网络/余额等前置条件（已购买用户即使后续断开钱包、切换错误网络或花光 YD 余额，仍应保留"开始学习"入口，不得被降级回未购买前置状态）。
2. 否则依次检查钱包前置条件：未连接 > 错误网络 > 余额不足。
3. 前置条件均满足后，**先查瞬时动作态，再查稳定态**：`isBuying` → `buying`；否则 `isApproved && !isBuying` → `ready-to-buy`；否则 `isApproving` → `approving`；否则（`!isApproved && !isApproving`）→ `needs-approval`。

完整优先级顺序：**已购买(`purchased`) > 未连接 > 错误网络 > 余额不足 > 购买中(`isBuying`) > 待购买(`isApproved` 且非购买中) > 授权中(`isApproving`) > 未授权(其余情况)**。

`components/course-detail/PurchasePanel.tsx`：根据 `PurchaseState` 渲染对应文案与按钮，按钮点击触发 Mock 异步流程（`setTimeout` 模拟 800-1500ms 等待），依次将「未授权→授权中→已授权（待购买）」「待购买→购买中→已购买」推进。

### 模块 3: 两阶段交易按钮组件

`components/course-detail/TwoPhaseTxButton.tsx`：根据设计系统「Transaction Button (Two-step)」规范实现——授权完成时以宽度过渡动画（Tailwind `transition-all`）从「Phase 1: Approve」变为「Phase 2: Purchase」，完成态使用 `secondary`（薄荷绿）对勾图标（Lucide `Check`）。

### 模块 4: 购买记录写入共享 Mock Store

购买成功后，调用 `lib/mock/purchaseStore.ts` 提供的 `recordPurchase(courseId, courseName, priceYD)` 方法，将记录（含 `courseName`）写入 `localStorage`（key 如 `mock_purchases`）。该 Store 是可选的跨 feature 集成点：feature 5（学习中心）、feature 6（个人中心）可选择读取此记录来判断"是否已购买"及渲染课程名，但均需自带默认 fixtures，不强制依赖此写入才能渲染。

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
