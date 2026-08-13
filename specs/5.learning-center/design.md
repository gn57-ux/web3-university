# 学习中心 — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-12 | v1 | 初始设计 |

## 项目架构

- 架构类型: 单体仓库，Next.js App Router
- 涉及层: 仅前端（`app/learn/[courseId]/page.tsx` 及其子组件）

## Stitch 设计稿依据

通过 Stitch MCP 读取项目 `projects/8237832631308458514`，页面 `学习中心 - Solidity 入门`（`screens/89f5fb50fee145ffa4818d4fb8883b0c`）得到的结构：

- **面包屑**：Home > Courses > Smart Contracts > Solidity 101。
- **视频区**：播放"Building Your First DApp"，时间进度 12:34 / 45:00，标准播放控制条。
- **代码示例**：视频下方展示一个简单合约代码块（状态变量 + public 函数管理 greeting 字符串）。
- **评论区**：展示如用户 `0x4A` 两小时前对 "memory vs calldata" 讲解的好评。
- **章节列表**：5 个模块的垂直列表，含已完成打勾、当前播放、锁定三种视觉态；截图摘要提及"整体进度 80%（4/5）"，但同时又写"前 3 个打勾+第4个当前播放+第5个锁定"，两者无法同时成立且后者本身也无法与"锁定态需真实出现"的验收要求（AC-002）兼容（若第4课已解锁播放、第5课仍锁定，5 课中只完成 3 课，进度应为 60% 而非 80%）。实现阶段**不强行匹配这个自相矛盾的 80% 数字**，改用模块 4 定义的通用「顺序解锁」算法（已完成课数 / 总课数 = 进度百分比，且完成/当前/锁定三态由已完成课数动态推导），初始 fixtures 下进度为 60%（3/5），但已完成/当前/锁定三种视觉态在初始状态下即可同时展示，满足 AC-002 的可验收性；此为对原始截图摘要自相矛盾之处的明确取舍，实现前若条件允许应通过 Stitch MCP 重新核对原始设计稿的真实完成课数与进度数字。
- **完课提示**：中文文案提示课程已完成、NFT 证书正在 Sepolia 测试网铸造中，引导返回个人中心查看。
- **页脚**：复用 `Footer`。

> 实现阶段须再次通过 Stitch MCP 读取原始设计稿确认章节状态图标、进度条样式与配色，不得仅凭本文档摘要还原。

## 功能模块设计

### 模块 0: 购课门禁

`app/learn/[courseId]/page.tsx` 顶层逻辑：调用 `lib/mock/purchaseStore.ts` 的 `getPurchases()`，判断 `getPurchases().some(p => p.courseId === courseId)`。

> **实现阶段更新**：本段原方案（`useEffect` + 初始 `useState` 置 `false`/`loading`）已在 feature 4 实现后被 `specs/LESSONS.md`（2026-08-12 Feature 4 条目）判定为反模式——`eslint-plugin-react-hooks` 的 `set-state-in-effect` 规则会拒绝在 effect 里同步 `setState` 恢复状态。实际实现改用 `useSyncExternalStore(subscribePurchases, () => getPurchases().some(...), () => false)`：`getServerSnapshot` 恒返回 `false` 保证 SSR/首次渲染一致，无需额外的"恢复期间骨架屏"状态。

- 已购买 → 正常渲染模块 1-6 的完整学习内容。
- 未购买 → 渲染 `components/learning-center/PurchaseRequiredGate.tsx`：展示"请先购买本课程"提示文案 + 跳转课程详情页（`Link href={`/courses/${courseId}`}`）按钮，不渲染视频/章节/评论等内容。
- 恢复期间（effect 尚未执行完毕）→ 展示与购买面板一致的骨架屏，避免闪烁。

`purchaseStore` 若尚未由 feature 4 实现，本模块可先对接一个返回空数组的占位 `getPurchases()`，此时门禁默认判定"未购买"，不阻塞本 feature 其余模块的独立开发；门禁行为本身的最终验收需等待 feature 4 完成。

### 模块 1: 面包屑与页面骨架

`components/learning-center/Breadcrumb.tsx`：静态层级导航，最后一级为当前课程/章节标题。

### 模块 2: 视频播放区（Mock）

`components/learning-center/MockVideoPlayer.tsx`：封面图 + 居中播放/暂停按钮（Lucide `Play`/`Pause`）+ 底部时间轴文本（`useState` 模拟播放时间递增，不接入真实 `<video>` 播放，或使用无声本地占位视频/静态图代替）。

### 模块 3: 代码示例区块

`components/learning-center/CodeSnippet.tsx`：只读代码块，使用 `<pre><code>` 配合 Tailwind `font-mono`（JetBrains Mono）与简单语法高亮 class（不引入额外的代码高亮第三方库，保持轻量；如需高亮效果，可用手写 class 区分关键字颜色）。

### 模块 4: 章节列表与进度（顺序解锁算法）

`components/learning-center/LessonList.tsx`：接收 `Lesson[]`（按 `order` 排序）与 `completedLessonIds: string[]`，按**顺序解锁**规则动态推导每课的视觉态与 `currentLessonId`，不额外维护单独的"当前课"状态字段：

- 课程 `order <= completedLessonIds.length` → **已完成**（勾选图标）。
- 课程 `order === completedLessonIds.length + 1` → **当前**（播放态，此即动态推导出的 `currentLessonId`；若 `completedLessonIds.length === lessons.length`，则不存在"当前"课，全部已完成）。
- 课程 `order > completedLessonIds.length + 1` → **锁定**（锁图标，不可点击播放）。

`components/learning-center/ProgressBar.tsx`：百分比 = `completedLessonIds.length / lessons.length`（与上述解锁算法共用同一个 `completedLessonIds`，天然保证进度百分比、视觉态、完课判定三者不会互相矛盾）。

> **实现阶段简化**：状态字段用 `completedCount: number`（已完成课数）代替 `completedLessonIds: string[]`（已完成课 id 列表）。在当前 fixtures 下每门课程的 `order` 均为连续 `1..lessons.length`，两者语义等价（`completedCount` 即 `completedLessonIds.length`），且不再需要额外维护 id 列表。若后续 fixtures 引入非连续 `order`（如允许乱序解锁、跳过某课），需改回 id 列表方案，不能再假设"已完成数量"与"顺序位置"一一对应。

初始 fixtures：5 课中前 3 课（模块 1-3）已计入 `completedLessonIds`，按算法推导：模块 4 为当前（可播放）、模块 5 为锁定，进度 `3 / 5 = 60%`——初始状态下已完成/当前/锁定三态同时可见，满足 AC-002。用户在当前课点击"标记本章完成"后该课 `order` 加入 `completedLessonIds`，下一课自动从锁定变为当前（顺序解锁），最后一课（模块 5）完成后 `completedLessonIds.length === lessons.length`（`5/5 = 100%`），触发模块 6 的完课与证书铸造提示，与 F-006 的 100% 触发条件严格一致，不存在提前显示 100% 或锁定态无法出现的矛盾。

### 模块 5: 评论区

`components/learning-center/CommentSection.tsx`：`useState<Comment[]>` 管理评论列表，初始值来自 `lib/mock/comments.ts`；输入框提交后 `setComments([newComment, ...comments])`，不做服务端持久化。

### 模块 6: 完课与证书铸造提示

`components/learning-center/CompletionBanner.tsx`：当 `completedLessonIds.length === lessons.length` 时渲染，展示"证书铸造中"Mock 文案与跳转个人中心的按钮（`Link href="/profile"`）。为便于演示，页面可提供一个"标记本章完成"按钮手动推进 `completedLessonIds`（仅用于满足验收标准的可操作性，非真实学习行为追踪）。

**涉及层及关键设计:**

- 全部为客户端组件，状态均为页面级 `useState`，无持久化要求（刷新丢失可接受，因为完课确认在当前阶段本就是 Mock 演示）。

## 接口契约

无。

## 数据模型

```ts
interface Comment {
  id: string
  author: string // 缩略钱包地址
  content: string
  postedAt: string
}
```

复用 feature 1 的 `Lesson` 类型；本 feature 在 `lib/mock/lessons.ts` 中为指定课程提供 5 条 `Lesson` fixtures。

## 安全考虑

- 评论输入框不做任何服务端提交，避免用户误以为评论会被持久化保存；如需要，可在 UI 文案中提示"当前为演示模式，评论不会保存"。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 视频播放实现 | 静态占位 + 播放态切换动画，不接入真实 `<video>` 流 | 当前阶段无真实视频资源与 CDN，Mock 展示交互态即可满足设计还原目标 |
| 代码高亮 | 手写 Tailwind class，不引入 Shiki/Prism 等第三方库 | 单个静态代码片段，无需引入完整高亮引擎，避免过度设计 |
