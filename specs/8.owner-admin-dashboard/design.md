# Owner 后台 — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-12 | v1 | 初始设计 |

## 项目架构

- 架构类型: 单体仓库，Next.js App Router
- 涉及层: 仅前端（`app/admin/page.tsx` 及其子组件）

## Stitch 设计稿依据

通过 Stitch MCP 读取项目 `projects/8237832631308458514`，页面 `管理员后台 - Web3 University`（`screens/a66bccdfcf7543d1a47fdf9808d4d876`）得到的结构：

- **整体布局**：顶部导航（Home/Courses/Teacher/Admin + 网络选择 + 钱包连接 + 管理员头像）+ 左侧五项功能侧边栏（概览/老师管理/课程审核/完课确认/设置）。
- **课程审核队列**：两条待审课程"Advanced Solidity Security"、"DeFi Mechanism Design"，展示老师地址、课程描述与通过/拒绝按钮。
- **老师白名单表**：地址、加入时间、启用状态、删除操作列，示例两位 2024年3月加入的老师。
- **完课确认**：学生地址 + 完成状态列表，100% 完成时提供"铸造 NFT"操作，用于颁发机构签发的灵魂绑定证书。
- **其他**：课程创建、支持入口、活动日志等辅助功能（当前阶段可选，非核心验收项）。
- **页脚**：复用 `Footer`。

> 实现阶段须再次通过 Stitch MCP 读取原始设计稿确认侧边栏图标、表格具体列宽与按钮配色，不得仅凭本文档摘要还原。

## 功能模块设计

### 模块 1: 后台布局与侧边栏

`components/admin/AdminSidebar.tsx`：静态导航项列表（概览/老师管理/课程审核/完课确认/设置），`useState<SectionKey>` 控制右侧内容区切换（单页面内 Tab 式切换，而非多路由，除非实现时判断多路由更合适）。`app/admin/page.tsx` 整体两栏布局：`AdminSidebar` + 内容区。

### 模块 2: 课程审核队列

`components/admin/CourseReviewQueue.tsx`：`useState<PendingCourse[]>` 管理待审列表，"通过"将该课程状态更新为 `active` 并从"待审核"区块移到"已上架"区块（两区块互斥展示，非从列表整体移除）；"拒绝"从数组中移除。

**实现阶段确认**：本模块用**卡片网格**（封面图 + 标题 + 讲师地址 + 描述摘要 + 通过/拒绝按钮），不复用模块 5 的通用表格组件——Stitch 原始截图（`screens/a66bccdfcf7543d1a47fdf9808d4d876`）本身就是卡片网格，且课程封面图、较长的描述摘要用表格承载会造成信息拥挤，不如卡片网格贴合设计稿。`requirements.md` F-005/AC-005 已同步更新为仅要求模块 3/4 两处表格样式统一。

### 模块 3: 老师白名单管理

`components/admin/TeacherWhitelistTable.tsx`：复用模块 5 的通用表格样式，`useState<TeacherApplication[]>` 管理列表；新增表单为顶部一行地址输入框 + "添加"按钮，提交后 `setTeachers([...teachers, newEntry])`；删除操作从数组中移除对应项。

### 模块 4: 完课确认

`components/admin/CompletionConfirmation.tsx`：列表展示学生地址 + 课程 + 完成百分比，"铸造 NFT"按钮点击后进入 Mock loading 态（`setTimeout` 模拟），完成后展示"已铸造"标记（不产生真实 `Certificate` 记录写入个人中心，二者为独立 Mock 场景，避免过度跨 feature 联动）。

### 模块 5: 通用管理表格样式

`components/admin/AdminTable.tsx`：无竖线（`border-none`）、行间细横向分隔线（`divide-y divide-outline-variant`）、表头文本使用 `font-mono`（JetBrains Mono）。供模块 3（老师白名单）/模块 4（完课确认）两处表格统一引用，避免样式重复实现；模块 2（课程审核队列）为卡片网格，不引用本组件（见模块 2 的实现阶段确认）。

### 模块 6: 权限提示占位

页面顶部固定展示一行提示条（非弹窗）："演示模式：当前未接入真实钱包与链上权限校验，此页面展示 Owner 视角的完整功能"，样式使用 `tertiary` 或 `outline` 低调配色，不喧宾夺主。

**涉及层及关键设计:**

- 全部客户端组件；数据均为页面级 `useState` 管理的 Mock 数组，无持久化要求。

## 接口契约

无。

## 数据模型

```ts
interface PendingCourse extends Course {
  submittedByAddress: string
  descriptionSummary: string
}

interface CompletionRequest {
  studentAddress: string
  courseId: string
  courseName: string
  completionPercent: number
  minted: boolean
}
```

复用 feature 1 的 `TeacherApplication` 类型用于白名单表格。

## 安全考虑

- 明确通过页面文案标注"演示模式"，避免歧义；不做任何真实地址签名校验或链上写入。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 侧边栏内容切换方式 | 单页面内 `useState` 切换 Section，而非多个独立路由 | 当前阶段数据量小、无需 SEO 独立路由，单页切换实现更简单，符合"最小范围"原则；如实现时发现多路由更利于后续维护，可调整但需在本文档同步更新 |
| 完课确认与个人中心证书的联动 | 不联动，各自独立 Mock 数据 | 避免为演示态功能引入复杂的跨 feature 数据同步，保持每个 feature 独立可验收 |
