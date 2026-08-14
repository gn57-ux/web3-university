# 首页 — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-12 | v1 | 初始设计 |
| 2026-08-13 | v2 | Hero 连接钱包 CTA 接入真实 `useWallet()`（随 1.wallet-auth 变更联动） |

## 项目架构

- 架构类型: 单体仓库，Next.js App Router
- 涉及层: 仅前端（`app/page.tsx` 及其子组件）

## Stitch 设计稿依据

通过 Stitch MCP 读取项目 `projects/8237832631308458514`，页面 `首页 - Web3 University`（`screens/a80f849de75942d3b942fd3da68fbeb7`）得到的结构：

- **导航**：顶部导航含 Home/Courses/Teacher/Admin 链接，钱包连接区显示 Sepolia Testnet 网络与余额（复用 feature 1 的 `TopNav`）。
- **Hero**：中英双语标题「学习 Web3，拥有你的学习成果」+ 定位文案（数字原生大学，聚焦区块链凭证）+ 探索课程/连接钱包 CTA。
- **关键指标**：三张统计卡 — 12,000+ 学生、45+ 课程、8,000+ 链上证书。
- **学习路径**：三步 — 1）通过 Faucet 领取 YD 2）用 YD 购买课程 3）完课铸造 ERC-721 证书。
- **精选课程**：两张课程卡 — 「Solidity 智能合约入门」（4 周入门）、「DeFi 与 Uniswap 实战」（8 周进阶）。首页截图摘要标注的价格（50 YD / 120 YD）与 feature 3（课程广场）、feature 4（课程详情，`docs/PRD.md` 全文示例价格均为 4 YD）不一致——同一门「Solidity 智能合约入门」课程不应在不同页面显示不同价格。实现阶段**统一以 4 YD 为该课程的规范价格**（与 PRD 的示例定价及 feature 3/4 的 fixtures 保持一致），首页卡片展示的价格须与点击跳转后的课程详情页价格相同；「DeFi 与 Uniswap 实战」若非 feature 3 已收录的课程，可按同一原则自行设定一个与其他页面不冲突的价格（如按课程周期比例设为更高档位），但需在实现时于本 feature 的 fixtures 注释中注明依据。
- **页脚**：条款/隐私/白皮书/文档链接 + "Built on Sepolia Testnet"（复用 feature 1 的 `Footer`）。

> 实现阶段须再次通过 `mcp__stitch__get_screen` / `download_assets` 读取该页面原始 HTML/截图，核对像素级间距、字号与配色，不得仅凭本文档摘要还原。

## 功能模块设计

### 模块 1: Hero 区块

`components/home/Hero.tsx`：使用设计令牌 `font-display`（Sora 48px/32px 移动端）渲染主标题，`body-lg`（Inter）渲染副文案。两个 CTA 按钮：主按钮（`primary-container` 紫罗兰实心，`rounded-md`）「浏览课程」→ `Link href="/courses"`；次按钮（描边或次级样式）「连接钱包」→ ~~调用 `useMockWallet().connect()`~~ `[v2 修改]` 调用 `useWallet().login()`（`import` 路径改为 `@/lib/wallet/useWallet`，见 1.project-foundation-design-system 的 v2 变更）。按钮三态：未登录「连接钱包」、登录中禁用态 + loading 指示、已登录展示 `address` 缩略（复用 `truncateAddress` 辅助函数，`address` 现在可能为 `null`，未登录/加载中都按"未登录"UI 处理，不解构失败）。

**涉及层及关键设计:**

- 纯展示 + 一个 Mock 状态调用，无表单、无校验。

### 模块 2: 关键指标区块

`components/home/StatsSection.tsx`：三张卡片，数据来自本 feature 内的本地常量（非 feature 1 的核心业务类型，属于展示性统计，可直接写死在组件内或独立 `homeStats.ts` 常量文件）。

### 模块 3: 学习路径区块

`components/home/LearningPath.tsx`：三步骤横向（桌面）/纵向（移动）排列，每步含图标（Lucide React）、标题、说明文字。

### 模块 4: 精选课程区块

`components/home/FeaturedCourses.tsx`：本页自带的轻量 `FeaturedCourseCard` 展示组件（标题、周期/难度标签、价格），使用 feature 1 定义的 `Course` 类型构造 2 条本地 fixtures。为保持 feature 间独立可验收，本组件不直接依赖 feature 3 的 `CourseCard` 实现，但视觉样式（圆角/阴影/字体）与其保持一致（均来自同一套设计令牌）。

**涉及层及关键设计:**

- 卡片点击跳转 `/courses/{id}`（若 feature 4 尚未实现该路由，跳转目标先占位，不阻塞本 feature 验收）。
- **价格字段必须与跳转目标一致**：若本 feature 的 `id` 与 feature 3/4 fixtures 中的某课程 `id` 相同（如「Solidity 智能合约入门」），`priceYD` 字段须复制该课程在 feature 3/4 中的规范值（4 YD），不得各自独立编造；避免用户从首页卡片点击进入详情页后看到价格突变。

## 接口契约

无。

## 数据模型

复用 feature 1 的 `Course` 类型（仅取 `id`/`title`/`level`/`priceYD`/`coverUrl` 字段）；`StatsSection` 使用独立本地常量，不进入共享类型定义。

## 安全考虑

- 无敏感操作；「连接钱包」按钮仅触发本地 Mock 状态切换。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 精选课程卡片实现 | 页面本地轻量组件，不复用 feature 3 的 `CourseCard` | 避免首页 feature 依赖课程广场 feature，保持两者可独立开发与验收 |
