# 老师工作台 — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-12 | v1 | 初始设计 |

## 项目架构

- 架构类型: 单体仓库，Next.js App Router
- 涉及层: 仅前端（`app/teacher/page.tsx` 及其子组件）

## Stitch 设计稿依据

通过 Stitch MCP 读取项目 `projects/8237832631308458514`，页面 `老师工作台 - Web3 University`（`screens/d9f4cd95b2d64cd590fea92bb3e3e59a`）得到的结构：

- **欢迎区**："欢迎回来, Alex 老师" + "管理您的课程并监控学生进度"，"提交新课程"按钮。
- **关键指标**：课程数 3、学生总数 1,540、待处理事项 1 项。
- **我的课程列表**：
  - "Solidity 入门"——已上架，78% 学生进度，1,204 学生，含编辑/数据分析入口。
  - "DApp 实战"——待审核，2 天前提交。
  - "Security 基础"——草稿，45% 完成度，含"提交审核"操作。
- **页脚**：复用 `Footer`。

> 实现阶段须再次通过 Stitch MCP 读取原始设计稿确认状态徽标配色（已上架/待审核/草稿三种状态对应的具体颜色）与表单弹窗的字段布局，不得仅凭本文档摘要还原。

## 功能模块设计

### 模块 1: 欢迎区与指标

`components/teacher/TeacherWelcome.tsx`：读取 Mock 当前老师身份（`lib/mock/currentUser.ts` 中角色为 `teacher` 的用户）与统计数据（本地常量或从课程列表派生：课程数=列表长度，学生总数=各已上架课程学生数求和，待处理事项=待审核课程数）。

### 模块 2: 提交新课程

`components/teacher/SubmitCourseModal.tsx`：受控表单（名称/描述/封面 URL/价格/章节占位），提交时校验必填字段（前端简单校验，非链上校验），成功后调用 `addCourse()`（页面级 `useState<Course[]>` 或 `lib/mock/teacherCourses.ts` 的内存/`localStorage` 封装）新增一条课程，初始状态统一设为 `"pending"`（待审核）——与后续审核流程（feature 8 的 Owner 审核）语义对齐，草稿态需老师主动"保存草稿"（如表单提供"保存草稿"与"提交审核"两个按钮，分别对应 `"draft"`/`"pending"`）。

### 模块 3: 我的课程列表

`components/teacher/TeacherCourseCard.tsx`：根据 `status` 渲染不同徽标颜色（已上架=`secondary` 薄荷绿、待审核=`tertiary` 琥珀、草稿=中性灰）与不同操作按钮组合（已上架：编辑+数据分析；待审核：编辑+撤回可选；草稿：编辑+提交审核+完成度展示）。

### 模块 4: 状态切换与空状态

课程状态切换（草稿→待审核）通过更新本地 `Course[]` 状态实现，不涉及权限校验。空列表时 `components/teacher/EmptyState.tsx` 展示引导文案与 CTA。

**涉及层及关键设计:**

- 全部客户端组件；课程数据存储于页面级状态或 `lib/mock/teacherCourses.ts` 封装的简单读写函数（可选用 `localStorage` 持久化，便于刷新后仍可见，具体是否持久化由实现时决定，非强制要求）。

## 接口契约

无。

## 数据模型

复用 feature 1 的 `Course` 类型，补充老师工作台专属展示字段（可作为可选属性扩展，或在组件层单独维护 `TeacherCourseView` 类型）：

```ts
interface TeacherCourseView extends Course {
  submittedDaysAgo?: number
  draftCompleteness?: number // 0-100，仅草稿态展示
  studentProgressPercent?: number // 仅已上架课程展示
}
```

## 安全考虑

- 无真实权限校验；页面文案应避免让人误以为该入口已做身份鉴权（当前阶段任何人访问该路由都能看到老师视角 Mock 数据，属于预期行为，后续里程碑接入 Privy 后才做真实角色校验）。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 新课程初始状态 | 统一为 `"pending"`（提供可选"保存草稿"按钮走 `"draft"`） | 与 PRD 描述的"老师创建课程→Owner 审核"主流程对齐，草稿仅作为未完成表单的中间态 |
| 数据持久化 | 可选 `localStorage`，非强制 | 当前阶段允许刷新丢失新增课程，优先保证 UI 与交互还原，持久化为加分项 |
