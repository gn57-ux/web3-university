# 开发计划索引

## 本次 PRD（2026-08-12）切分为 9 个 feature

来源需求：`docs/PRD.md`（业务背景）+ 本次 `/yd:prd` 输入指令（当前阶段范围约束）+ Stitch 设计稿项目 `Web3 University UI 设计系统`（`projects/8237832631308458514`，视觉表现依据）。

当前阶段范围：仅实现 Stitch 设计稿对应的纯 Web UI 与 Mock 交互（Next.js App Router + TypeScript + Tailwind CSS + Lucide React）。不接入 Privy、Supabase、真实智能合约、Chainlink、The Graph、Uniswap。`contracts/` 下现有 Solidity 合约保持不变。

| 序号 | feature | 说明 | 依赖 | 状态 |
| --- | --- | --- | --- | --- |
| 1 | project-foundation-design-system | Next.js 项目脚手架、Tailwind 设计令牌（Stitch "Ethereal Academy" 设计系统）、全局导航/页脚、Mock 数据类型与 Mock 钱包状态 | - | 待开发 |
| 2 | homepage | 首页：Hero、关键指标、学习路径、精选课程 | 1 | 待开发 |
| 3 | course-marketplace | 课程广场：搜索/难度筛选、课程卡网格 | 1 | 待开发 |
| 4 | course-detail-mock-purchase | 课程详情页 + 模拟购买状态机（授权/购买两阶段） | 1 | 待开发 |
| 5 | learning-center | 学习中心：视频区、章节进度、评论、完课与证书铸造中提示、购课门禁 | 1, 4（弱依赖，共享 purchaseStore） | 待开发 |
| 6 | profile-center | 个人中心：资料、签名改名弹窗、四个 Tab（已购/进度/证书/交易记录） | 1, 4（弱依赖，共享 purchaseStore） | 待开发 |
| 7 | teacher-workspace | 老师工作台：提交课程、我的课程状态管理 | 1 | 待开发 |
| 8 | owner-admin-dashboard | Owner 后台：课程审核、老师白名单、完课确认铸造 | 1 | 待开发 |
| 9 | responsive-visual-qa | 响应式与视觉 QA：断点走查、对照 Stitch 截图核验、问题修复 | 2,3,4,5,6,7,8 | 待开发 |

**推荐执行顺序**：1 → 4 →（2, 3, 5, 6, 7, 8 可在 1、4 完成后并行，其中 5、6 对 4 为弱依赖） → 9

## 切分说明

- 用户在指令中明确列出的 8 个覆盖点（首页/课程广场/课程详情与模拟购买/学习中心/个人中心/老师工作台/Owner 后台/响应式和视觉 QA）对应 feature 2-9。
- 新增 feature 1（project-foundation-design-system）是脚手架前置项：Stitch 设计稿的 7 个页面截图中，每个页面都复用同一套顶部导航（Logo/导航链接/钱包状态徽标/网络徽标）、页脚，以及同一套设计令牌（暗色模式、Sora/Inter/JetBrains Mono 三字体、8px 网格、紫色主色+薄荷绿辅色+琥珀第三色）。若不先固化这些共享部分，2-8 各 feature 会重复实现导航/主题配置，违反「高内聚、依赖最少」原则，因此拆为独立的前置 feature。
- feature 2、3、7、8 仅依赖 1（共享导航/页脚/设计令牌/Mock 钱包 Context），彼此不互相依赖，各自内置独立的 Mock fixtures，可单独验收。
- feature 5（学习中心）、6（个人中心）对 4（课程详情与模拟购买）为**弱依赖**：均通过 4 提供的共享 Mock Store（`purchaseStore.getPurchases()`）读取购买记录（5 用于购课门禁判断，6 用于展示已购课程/购买记录），但各自的 UI 开发不因 4 未完成而阻塞——`getPurchases()` 缺失实现时可先接一个返回空数组的占位版本（5 的门禁会默认展示"未购买"锁定态，6 回退本地 fixtures），最终购课门禁与购买记录展示的完整验收仍需 4 已完成。
- feature 9 是收尾的横向 QA，依赖 2-8 全部完成后才能逐页走查。

## ID 编号约定

- 功能需求 / 任务 / 验收标准 ID **在单个 feature 内编号**，跨 feature 用 `{序号}.` 前缀区分。
- 例：`4.T-006` = 序号 4 这个 feature 的 T-006；`9.F-002` = 序号 9 的 F-002。
- **跨 feature 依赖**写全限定 ID，如 `9.T-002 依赖 2.T-005, 3.T-006, 4.T-007`。

## Stitch 设计稿来源

- 项目：`Web3 University UI 设计系统`（`projects/8237832631308458514`）
- 设计系统：`Ethereal Academy`（暗色模式，主色 `#7c3aed` 紫罗兰，辅色 `#10b981` 薄荷绿，第三色 `#f59e0b` 琥珀，字体 Sora/Inter/JetBrains Mono，8px 网格，容器最大宽度 1280px）
- 7 个已生成页面截图：首页、课程广场、课程详情（Solidity 入门）、学习中心（Solidity 入门）、个人中心、老师工作台、管理员后台
- 各 feature 的 `design.md` 中记录了通过 Stitch MCP 读取到的对应页面结构要点；实现阶段须再次通过 Stitch MCP（`get_project`/`list_screens`/`get_screen`/`download_assets`）读取原始设计稿确认像素级细节，不得仅凭本文档摘要或截图猜测。
