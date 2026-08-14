# Privy 钱包身份接入 — 需求规格

## 概述

将 Mock 钱包身份/连接/网络层替换为真实 Privy Email 登录 + 自动创建的 Ethereum 嵌入式钱包，接入 Sepolia 网络。本 feature 是 `1.project-foundation-design-system`、`2.homepage`、`4.course-detail-mock-purchase`、`6.profile-center` 四个 feature 已记录的 v2 需求变更的**统一实现项**——那四个 feature 的 `requirements.md`/`design.md` 保留了各自受影响功能点的变更说明（`[v2 修改]`/`[v2 新增]` 标注），但实际的实现任务集中在本 feature，避免任务分散导致单个 feature 任务数超出 4-8 个的强约束。

`ydBalance`（YD 余额）、Faucet 领取、课程购买、证书铸造等业务逻辑**保持 100% Mock 不变**——本次不接入 YD Token 合约、课程购买合约、Supabase。

## 项目信息

- 项目名: web3-university
- 架构类型: 单体仓库：Next.js 前端（真实钱包身份层 + 其余 Mock 交互）

## 需求版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-13 | v1 | 初始需求（从 `/yd:prd --change 1.wallet-auth` 拆分为独立 feature，集中管理 Privy 接入的全部实现任务） |

## 用户故事

- 作为访客，我想要用邮箱一键登录并自动获得一个 Ethereum 嵌入式钱包，以便无需预装浏览器插件即可使用平台。
- 作为已登录用户，我想要在任意页面看到自己真实的钱包地址和当前网络状态，以便确认身份和链上环境正确。
- 作为已登录用户，若我当前不在 Sepolia 网络，我想要一键切换，以便继续使用平台功能。
- 作为访客，若登录或切换网络失败，我想要看到明确的错误提示，以便知道发生了什么、可以怎么做。

## 功能需求

1. [F-001] 安装并配置 `@privy-io/react-auth`；`NEXT_PUBLIC_PRIVY_APP_ID` **仅通过环境变量读取**，缺失时启动/渲染阶段给出明确报错（不得静默用假值运行）；真实 App ID **只允许存在于本地 `.env.local`**（不提交仓库）；`.env.example` **只能写占位符**（如 `NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id`），**禁止写入真实 App ID**。
2. [F-002] 实现 `lib/wallet/useWallet.tsx` 统一适配层（原 `lib/wallet/useMockWallet.tsx` 重命名替换）：对外暴露 `connected`/`address`（`string | null`）/`network`（`"sepolia" | "wrong-network" | null`）/`authError`/`login()`/`logout()`/`switchToSepolia()`/`ydBalance`/`setYdBalance()`。**本次仅支持 Privy Email 登录（不含短信/社交等其它方式）自动创建的 Ethereum 嵌入式钱包，不支持 MetaMask、WalletConnect、多钱包绑定或任何外部钱包连接方式**。
3. [F-003] `components/layout/TopNav.tsx` 钱包徽标接入真实状态：未登录展示登录按钮（触发 `login()`）、登录中 loading 态、已登录展示地址缩略+绿色状态点、当前链非 Sepolia 时网络徽标切换警示态且可点击触发 `switchToSepolia()`、`authError` 非空时展示简短错误提示。
4. [F-004] `components/home/Hero.tsx`「连接钱包」CTA 接入真实 `login()`，按钮态随登录状态（未登录/登录中/已登录）正确变化。
5. [F-005] `components/course-detail/PurchasePanel.tsx`/`lib/purchase/usePurchaseFlow.ts` 的「未连接钱包」「需切换网络」前置状态接入真实身份（`wallet.connected`/`wallet.network`），其余 Mock 阶段（YD 余额不足/待授权/授权中/待购买/购买中/已购买）不变。
6. [F-006] 个人中心新增登录门禁：`app/profile/page.tsx` 未登录时展示 `components/profile/LoginRequiredGate.tsx`（不渲染任何资料/Tab 内容），登录后展示真实资料头部（`components/profile/ProfileHeader.tsx` 接入真实 `address`）。
7. [F-007] 全局错误态/加载态/`switchToSepolia()` 行为统一核查：确认 TopNav/Hero/PurchasePanel/Profile 四个消费点在登录中、切网中、失败时的 UI 反馈一致，不出现卡死、静默失败或状态不同步。
8. [F-008] 集成测试与响应式回归：完整登录 → 各页面操作 → 退出登录流程手动联调；对照 `9.responsive-visual-qa` 已建立的三档断点矩阵（375/768/1280 等）走查全部受影响页面。

## 非功能需求

- 性能: Privy SDK 初始化不应阻塞首屏可交互时间；`ready` 为 `false` 期间各消费点展示 loading/骨架态而非报错或空白。
- 安全: `NEXT_PUBLIC_PRIVY_APP_ID` 仅通过环境变量读取，真实值只允许存在于本地 `.env.local`（不提交仓库，`.gitignore` 已覆盖），`.env.example` 只能写占位符；不存储、不接触 Ethereum 嵌入式钱包私钥或助记词（由 Privy 托管）。
- 兼容性: 桌面/平板/移动三档断点下，登录按钮、网络徽标、错误提示、登录门禁均正确展示，不溢出、不遮挡主要内容。

## 验收标准

- [ ] [AC-001] 缺少 `NEXT_PUBLIC_PRIVY_APP_ID` 时应用在启动/渲染阶段给出明确报错提示，不以假值静默运行。
- [ ] [AC-002] `TopNav`、首页 Hero 的登录入口均能正确打开 Privy 登录模态框；登录成功后两处状态同步更新为已登录并展示真实地址。
- [ ] [AC-003] 已登录用户处于非 Sepolia 网络时，`TopNav` 与课程详情购买面板均展示"需切换网络"提示，点击后正确触发 `switchToSepolia()`，成功后状态正确更新为 Sepolia。
- [ ] [AC-004] 未登录访问 `/profile` 展示登录门禁（不泄露任何资料内容）；登录后无需刷新页面即展示真实资料；退出登录后重新回到门禁态。
- [ ] [AC-005] 登录或切换网络失败时，`authError` 对应的错误提示在 `TopNav` 可见；不导致页面卡死、按钮永久停留在 loading 态，或状态与实际登录情况不一致。
- [ ] [AC-006] 桌面（≥1280px）/平板（768-1279px）/移动（<768px）三档断点下，首页、课程详情、个人中心的登录相关 UI（按钮、徽标、门禁区块）均正常展示，无溢出/遮挡/重叠。
- [ ] [AC-007] 课程购买面板 `insufficient-balance` 及之后的所有 Mock 阶段（Faucet 领取/授权/购买/开始学习）行为与本次变更前完全一致，无回归。

## 依赖

- [[1.project-foundation-design-system]]（TopNav/Footer/设计令牌/`Course` 类型；本 feature 重写其 `lib/wallet/useMockWallet.tsx`）
- [[2.homepage]]（Hero 连接钱包 CTA，消费方）
- [[4.course-detail-mock-purchase]]（购买面板前置状态，消费方）
- [[6.profile-center]]（资料头部 + 新增登录门禁，消费方）
- 外部依赖：Privy 应用（需在 [Privy Dashboard](https://dashboard.privy.io/) 创建并获取 `NEXT_PUBLIC_PRIVY_APP_ID`，写入本地 `.env.local`；不属于本次 `/yd:prd` specs 产出范围，`/yd:ai` 执行到 T-001 时若环境变量缺失应视为环境阻塞暂停，不得虚构假值）

## 开放问题

- 无。范围已在 `/yd:prd --change 1.wallet-auth` 指令与用户后续确认中明确：仅 Email 登录 + 自动创建 Ethereum 嵌入式钱包（不支持外部钱包连接），个人中心增加登录门禁。
