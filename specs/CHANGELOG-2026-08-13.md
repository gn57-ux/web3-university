# 变更日志 — 2026-08-13

本次运行完成 Feature 2、3、5、6、7、8、9（Feature 1 project-foundation-design-system、Feature 4 course-detail-mock-purchase 于 2026-08-12 已完成）。至此 `specs/PLAN.md` 全部 9 个 feature 均已交付。

## Feature 2: homepage（首页）

### 新增
- Hero 区块（双语标题 + CTA，复用全局 `useMockWallet` 同步连接状态）
- 关键指标区块（学生数/课程数/证书数三张统计卡）
- 学习路径三步骤区块
- 精选课程区块（独立轻量卡片，价格/难度权威字段读自共享 `mockCourses`）

### 关键文件
- `components/home/{Hero,StatsSection,LearningPath,FeaturedCourses}.tsx`
- `lib/mock/homeStats.ts`

### 架构决策
- 精选课程价格改动前先 grep 确认该课程是否已被其它 feature 引用，避免同一课程跨页面价格不一致（详见 `specs/memory/shared-fixture-price-scope.md`）。

## Feature 3: course-marketplace（课程广场）

### 新增
- 搜索 + 难度筛选（Tab 化，非 Stitch 截图的下拉，复用全站统一的"初级/中级/高级"术语）
- 课程网格、骨架屏、空状态
- 补齐 `web3-dapp-from-zero` 的 `CourseDetail` fixture（此前缺失导致点击 404）

### 关键文件
- `components/marketplace/{FilterBar,CourseCard,CourseGrid,CourseCardSkeleton,EmptyState}.tsx`
- `lib/mock/filterCourses.ts`

### 架构决策
- 课程卡渲染为可点击详情入口前，先确认 `courseDetails.ts` 是否已覆盖该课程（`specs/memory/course-detail-fixture-coverage.md`）。
- Stitch 原稿与 spec 摘要文案不一致时，以 Stitch 为准落地并双向回写 spec（`specs/memory/stitch-vs-spec-text-drift.md`）。

## Feature 5: learning-center（学习中心）

### 新增
- 购课门禁（`useSyncExternalStore` 复用 feature 4 已验证模式）
- Mock 视频播放器、代码示例、章节顺序解锁进度条、评论区、完课证书铸造提示
- `mockLessons` 扩展覆盖全部 3 门课程，标题与 `courseDetails.ts` 的 curriculum 对齐

### 关键文件
- `components/learning-center/{LearningCenter,MockVideoPlayer,CodeSnippet,LessonList,ProgressBar,PurchaseRequiredGate,CommentSection,CompletionBanner,Breadcrumb}.tsx`
- `lib/mock/comments.ts`

### 架构决策
- 组件需要在 prop 变化时重置内部状态，用 `key` 重新挂载而非 `useEffect` 里 setState（`specs/memory/reset-state-via-key.md`）。
- 同一课程的模块/章节标题跨页面要复用同一份 fixture（`specs/memory/lesson-title-consistency-across-pages.md`）。

## Feature 6: profile-center（个人中心）

### 新增
- 资料头部（读自 `useMockWallet`）、签名式改名弹窗
- 四个 Tab：已购课程/学习进度/NFT 证书/购买记录，优先展示真实购买记录、回退本地 fixtures

### 关键文件
- `components/profile/{ProfileHeader,EditUsernameModal,ProfileTabs,PurchasedCoursesTab,LearningProgressTab,CertificatesTab,PurchaseRecordsTab}.tsx`
- `lib/purchase/useProfilePurchases.ts`、`lib/mock/profileFixtures.ts`

### 架构决策
- `useSyncExternalStore` 的 `getSnapshot` 返回数组/对象必须保证引用稳定，否则无限重渲染（`specs/memory/use-sync-external-store-array-snapshot.md`，已同步修复 `lib/mock/purchaseStore.ts`）。
- 本地回退演示数据的交互入口不能承诺超出真实业务门禁范围（`specs/memory/fallback-data-vs-real-gate-consistency.md`）。

## Feature 7: teacher-workspace（老师工作台）

### 新增
- 欢迎区+指标、提交/编辑课程弹窗（草稿/待审核二选一，编辑非草稿课程锁定为"保存修改"）
- 课程卡状态徽标、Mock 数据分析弹窗、空状态

### 关键文件
- `components/teacher/{TeacherWelcome,SubmitCourseModal,TeacherCourseCard,CourseAnalyticsModal,EmptyState,courseStatus}.tsx`
- `lib/mock/teacherFixtures.ts`

### 架构决策
- `next/image` 渲染用户自由填写的外部图片 URL 会崩溃，需区分本地/外部来源（`specs/memory/next-image-external-url-crash.md`）。
- 新建/编辑共用表单弹窗时，编辑非初始状态实体需单独设计按钮行为（`specs/memory/shared-form-modal-edit-vs-create.md`）。

## Feature 8: owner-admin-dashboard（Owner 后台）

### 新增
- 侧边栏导航（桌面垂直 / 移动端下拉）、课程审核队列（卡片网格）、老师白名单表格、完课确认与铸造
- 通用管理表格样式组件（白名单/完课确认复用）

### 关键文件
- `components/admin/{AdminSidebar,AdminTable,AdminOverview,DemoModeBanner,CourseReviewQueue,TeacherWhitelistTable,CompletionConfirmation}.tsx`
- `lib/mock/adminFixtures.ts`

### 架构决策
- 列表里每行独立触发的异步操作，状态需按行 key 追踪（Set/Map），不能用单值 `useState`（`specs/memory/per-row-async-state-tracking.md`）。
- spec 文档内部自相矛盾（课程审核队列表格 vs 卡片）时，优先按 Stitch 原稿实现再回写 spec（`specs/memory/spec-internal-contradiction-resolution.md`）。

## Feature 9: responsive-visual-qa（响应式与视觉 QA）

### 修复
- `components/layout/TopNav.tsx`：桌面导航与移动汉堡菜单的切换断点从 `md`（768px）统一提高到 `lg`（1024px），消除两者在 768-818px 区间"都不满足显示条件"的空档（三个独立并行走查小组互相印证发现）。
- `components/course-detail/CourseReviews.tsx`：星级评分颜色从误用的 `tertiary`（代币/余额语义）改为 `secondary`（正向反馈语义）。

### 关键文件
- `specs/9.responsive-visual-qa/qa-summary.md`（完整核验范围、断点矩阵、问题清单）

### 架构决策
- 共享布局组件的响应式断点问题要在断点数值本身附近精确测试，不能只测代表性宽度（`specs/memory/shared-layout-breakpoint-edge-cases.md`）。
