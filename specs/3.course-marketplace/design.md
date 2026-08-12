# 课程广场 — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-12 | v1 | 初始设计 |

## 项目架构

- 架构类型: 单体仓库，Next.js App Router
- 涉及层: 仅前端（`app/courses/page.tsx` 及其子组件）

## Stitch 设计稿依据

通过 Stitch MCP 读取项目 `projects/8237832631308458514`，页面 `课程广场 - Web3 University`（`screens/012302c4c89f4fd8a2c554510f3aad2e`）得到的结构：

- **导航**：Logo「Web3 University」+ Home/Courses/Teacher/Admin + 搜索图标 + 钱包连接按钮（复用 `TopNav`）。
- **Hero/筛选区**：主标题「掌握最新的区块链技术、智能合约开发和去中心化金融原理，开启您的数字主权之旅」+ 搜索框 + 难度筛选（全部/初级/中级/高级）。
- **课程卡网格**：三列（桌面）布局，每卡含封面图、难度徽标、标题、讲师姓名+图标、价格（示例 4 YD）、报名人数+图标。示例课程：「Solidity 智能合约入门」（Prof. Alex Chen，1,240 人）、「从零构建 Web3 DApp」（Sarah Wang，856 人）、「DeFi 与 Uniswap 实战」（Dr. Robert Lee，540 人）。
- **页脚**：复用 `Footer`。

> 实现阶段须再次通过 Stitch MCP 读取该页面原始设计稿确认卡片间距、图片比例与配色细节。

## 功能模块设计

### 模块 1: 搜索与筛选区

`components/marketplace/FilterBar.tsx`：受控搜索输入框（`useState`）+ 难度 Tabs（`useState<Level | "all">`）。父组件 `app/courses/page.tsx` 持有筛选状态，将过滤后的课程列表传给网格组件。

### 模块 2: CourseCard 组件

`components/marketplace/CourseCard.tsx`：接收 `Course` 类型 props，渲染封面（`next/image` 或占位图）、难度徽标（三种颜色对应初/中/高级）、标题（`font-headline`）、讲师、价格（`tertiary` 琥珀色数字 + YD 单位）、报名人数。点击整卡跳转 `/courses/{course.id}`。

### 模块 3: 课程网格与 Mock 数据

`lib/mock/courses.ts`（扩展 feature 1 的 fixtures，或在此定义课程广场专属的更完整课程列表，≥3 条）。网格组件 `components/marketplace/CourseGrid.tsx` 接收已过滤列表，网格列数按 Tailwind 响应式 class 控制（如 `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`，对应设计系统 4/8/12 列网格换算后的实际卡片列数）。

### 模块 4: 空状态与骨架屏

`components/marketplace/EmptyState.tsx`、`components/marketplace/CourseCardSkeleton.tsx`：过滤结果为空时渲染前者；页面 mount 后短暂（如 300-500ms）展示骨架屏模拟加载态，随后渲染真实 Mock 数据（不发起任何网络请求，仅用 `setTimeout` 模拟）。

**涉及层及关键设计:**

- 全部为客户端组件（`"use client"`），过滤逻辑为纯函数，位于页面组件或独立 `lib/mock/filterCourses.ts`。

## 接口契约

无。

## 数据模型

复用 feature 1 的 `Course` 类型，本 feature 在 `lib/mock/courses.ts` 中补充至少 3 条完整 fixtures（含 `level`/`enrolledCount`/`coverUrl` 等字段）。

## 安全考虑

- 无敏感操作，纯展示与客户端过滤。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 过滤实现 | 纯前端 `Array.filter`，无防抖 | 数据量极小（Mock 阶段个位数到十几条），无性能问题，避免过度设计 |
| 骨架屏触发方式 | `useEffect` + `setTimeout` 模拟短暂 loading | 用于验证设计稿中的骨架态视觉，无需真实异步数据源 |
