# 开发计划索引

## 本次 PRD（2026-08-12）切分为 9 个 feature

来源需求：`docs/PRD.md`（业务背景）+ 本次 `/yd:prd` 输入指令（当前阶段范围约束）+ Stitch 设计稿项目 `Web3 University UI 设计系统`（`projects/8237832631308458514`，视觉表现依据）。

当前阶段范围：仅实现 Stitch 设计稿对应的纯 Web UI 与 Mock 交互（Next.js App Router + TypeScript + Tailwind CSS + Lucide React）。~~不接入 Privy~~、不接入 Supabase、~~真实智能合约~~、Chainlink、The Graph、Uniswap。`contracts/PrivateBank.sol`、`contracts/EthRedPacket.sol`（Remix 教学示例）保持不变。**`[2026-08-13 起]`** Privy 已通过下方「变更记录」引入，但仅限身份/钱包连接层（登录/退出/地址/网络），不涉及 YD 合约、课程购买合约、Supabase——其余 Mock-only 边界不变。**`[2026-08-19 起]`** Feature 11/12/13 已在 `contracts/web3-university/`（独立 Foundry 工程）落地真实智能合约 MVP（`YDToken`/`YDFaucet`/`Web3University`/`CourseCertificate`/`DemoCompletionOracle`），但前端（根目录 Next.js）尚未接入这些合约——`lib/purchase/`、`lib/wallet/` 等仍是 Mock/Privy-only 实现，接入真实合约调用是后续里程碑，不在本次范围内。

| 序号 | feature | 说明 | 依赖 | 状态 |
| --- | --- | --- | --- | --- |
| 1 | project-foundation-design-system | Next.js 项目脚手架、Tailwind 设计令牌（Stitch "Ethereal Academy" 设计系统）、全局导航/页脚、Mock 数据类型与 Mock 钱包状态 | - | v1 已完成，v2（Privy 登录，由 10 统一实现）已完成 |
| 2 | homepage | 首页：Hero、关键指标、学习路径、精选课程 | 1 | v1 已完成，v2（接入真实钱包，由 10 统一实现）已完成 |
| 3 | course-marketplace | 课程广场：搜索/难度筛选、课程卡网格 | 1 | v1 已完成 |
| 4 | course-detail-mock-purchase | 课程详情页 + 模拟购买状态机（授权/购买两阶段） | 1 | v1 已完成，v2（接入真实钱包，由 10 统一实现）已完成 |
| 5 | learning-center | 学习中心：视频区、章节进度、评论、完课与证书铸造中提示、购课门禁 | 1, 4（弱依赖，共享 purchaseStore） | v1 已完成 |
| 6 | profile-center | 个人中心：资料、签名改名弹窗、四个 Tab（已购/进度/证书/交易记录） | 1, 4（弱依赖，共享 purchaseStore） | v1 已完成，v2（接入真实钱包 + 登录门禁，由 10 统一实现）已完成 |
| 7 | teacher-workspace | 老师工作台：提交课程、我的课程状态管理 | 1 | v1 已完成 |
| 8 | owner-admin-dashboard | Owner 后台：课程审核、老师白名单、完课确认铸造 | 1 | v1 已完成 |
| 9 | responsive-visual-qa | 响应式与视觉 QA：断点走查、对照 Stitch 截图核验、问题修复 | 2,3,4,5,6,7,8 | v1 已完成 |
| 10 | wallet-auth-integration | Mock 钱包 → 真实 Privy Email 登录 + Ethereum 嵌入式钱包（Sepolia），统一实现 1/2/4/6 已记录的钱包身份变更 | 1, 2, 4, 6 | v1 已完成 |
| 11 | yd-token-faucet | Foundry 工程骨架 + `YDToken`（ERC-20）+ `YDFaucet`（限领水龙头） | - | v1 已完成 |
| 12 | course-marketplace-contract | `Web3University`：老师白名单、课程审核上下架、`buyCourse`（价格读链上配置）、购买记录 | 11 | v1 已完成 |
| 13 | course-certificate-completion | `CourseCertificate`（ERC-721）+ `DemoCompletionOracle` + `Web3University` 完课确认接线 | 12 | v1 已完成 |

**推荐执行顺序**：1 → 4 →（2, 3, 5, 6, 7, 8 可在 1、4 完成后并行，其中 5、6 对 4 为弱依赖） → 9 → 10（在现有 9 个 feature 全部完成后执行，10 内部任务顺序见其 tasks.md：T-001→T-002→T-003→(T-004~T-007 并行)→T-008） → 11 → 12 → 13（智能合约 MVP 三个 feature 严格串行，12 依赖 11 的 `YDToken`，13 依赖 12 的 `Web3University`）

## 变更记录（2026-08-19）：新增 11/12/13 — 智能合约 MVP（Foundry）

`/yd:prd` 新建模式，来源需求：`docs/PRD.md` 第 7 节「智能合约需求」+ 本次用户指令的技术选型约束（Foundry、Solidity 0.8.24、OpenZeppelin、分离合约架构、SafeERC20、自定义 error、权限控制、必要的重入保护、课程价格不写死）。

- **切分依据**：PRD 第 7 节列出的 5 个合约按依赖关系分成 3 个 feature，而非 1 个大 feature（预估任务数会超过单 feature 4-8 上限）或 5 个各自为政的合约级 feature（`Web3University` 的完课/证书字段与 `CourseCertificate`/`DemoCompletionOracle` 强耦合，拆开会破坏"高内聚"）：
  - `11.yd-token-faucet`：`YDToken` + `YDFaucet`，且承担 Foundry 工程骨架搭建（后两个 feature 复用），无外部依赖，可最先独立交付。
  - `12.course-marketplace-contract`：`Web3University` 初版（老师白名单、课程生命周期、购买），依赖 11 的 `YDToken`。
  - `13.course-certificate-completion`：`CourseCertificate` + `DemoCompletionOracle` + 扩展 `Web3University` 的完课确认入口，依赖 12。
- **架构决策**：单体合约 vs 分离合约的比较记录在 `specs/11.yd-token-faucet/design.md`「架构决策」小节，结论为分离合约（5 个独立部署的合约，通过地址引用互相调用），对 11/12/13 三个 feature 均生效。
- **新增子工程**：`contracts/web3-university/`（Foundry 工程，`src/`/`test/`/`script/`/`lib/`），与仓库现有 `contracts/PrivateBank.sol`、`contracts/EthRedPacket.sol`（Remix 教学示例，禁止修改）物理隔离，互不影响。
- **强约束**（贯穿三个 feature）：不接入真实 Chainlink/Uniswap/主网/代理升级/退款/DAO/质押；部署脚本只做本地 dry-run，不含真实私钥/RPC/broadcast，不部署 Sepolia；不读取或提交 `.env.local`。
- **执行方式**：本次 `/yd:prd` 生成 specs 后立即衔接 `/yd:ai` 自动执行全部任务，全程不因常规代码问题/Review finding 暂停，仅在需要真实私钥、RPC、区块浏览器密钥、破坏性操作、安全授权或 Review 达到轮次上限仍无法通过时暂停。

## 变更记录（2026-08-13）：1.wallet-auth — Mock 钱包 → 真实 Privy 登录

`/yd:prd --change 1.wallet-auth` 触发的需求变更：将 Mock 钱包身份/连接/网络层替换为真实 Privy Email 登录 + 自动创建的 Ethereum 嵌入式钱包，接入 Sepolia 网络；`ydBalance`（YD 余额）与课程购买/证书铸造等业务逻辑**保持 100% Mock 不变**——本次不接入 YD Token 合约、课程购买合约、Supabase。

**Feature 切分修正**：首版变更曾直接把新任务追加进 `1`/`2`/`4`/`6` 各自的 `tasks.md`，导致这几个 feature 的任务数分别达到 12/7/9/10，违反单 feature 4-8 个任务的强约束。已改为：`1`/`2`/`4`/`6` 的 `requirements.md`/`design.md` **保留** v2 变更说明（记录"改了哪个 F-ID、为什么改"），但 `tasks.md` **不新增任务**、保持原有 v1 已完成任务不变；全部实现任务集中新建到独立的 `10.wallet-auth-integration`（8 个任务，符合约束）。

- **受影响的需求/设计（叙述保留在原 feature，不新增任务）**：
  - `1.project-foundation-design-system`（v1→v2）：`useMockWallet` → `useWallet`，破坏性 API 变更：`connect`→`login`、`disconnect`→`logout`、`setNetwork`→`switchToSepolia`、`address` 从恒为字符串变为可能为 `null`；`TopNav` 徽标接入真实状态。
  - `2.homepage`（v1→v2）：Hero「连接钱包」CTA 改用 `login()`。
  - `4.course-detail-mock-purchase`（v1→v2）：购买面板的 `wallet-disconnected`/`wrong-network` 前置状态改用真实身份，`insufficient-balance` 起的后续状态不变。
  - `6.profile-center`（v1→v2）：资料头部地址改用真实身份，**新增登录门禁**（未登录访问 `/profile` 展示门禁而非资料，新增 F-008/AC-005）。
- **统一实现入口**：`10.wallet-auth-integration`（新建独立 feature，8 个任务，覆盖上述四处改动 + Privy 基础设施 + 集成测试回归）。
- **不受影响**：`3.course-marketplace`、`5.learning-center`、`7.teacher-workspace`、`8.owner-admin-dashboard`、`9.responsive-visual-qa`（均不消费钱包 Hook，或仅消费不受本次变更影响的 `purchaseStore`）。
- **新增外部依赖（阻塞项）**：需要用户在 [Privy Dashboard](https://dashboard.privy.io/) 创建应用并提供 `NEXT_PUBLIC_PRIVY_APP_ID`；真实值只允许写入本地 `.env.local`（不提交仓库），`.env.example` 只能写占位符（禁止写入真实 App ID）。`/yd:ai` 执行到 `10.T-001` 时若该环境变量缺失，应视为环境阻塞暂停，不得虚构假值。
- **登录方式范围**：仅 Privy **Email 登录**（不含短信/社交），自动创建 **Ethereum** 嵌入式钱包，不支持 MetaMask、WalletConnect、多钱包绑定或任何外部钱包连接。
- **本次 `/yd:prd` 只生成/更新 specs，未运行 `/yd:ai`，未提交、未推送**——`10.wallet-auth-integration` 的 8 个任务全部待开发（`[ ]`），`1`/`2`/`4`/`6` 的 `tasks.md` 已还原为仅含原 v1 已完成任务（`[x]`，未改动）。

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
