# 项目脚手架与设计系统 — 需求规格

## 概述

搭建 Next.js App Router + TypeScript + Tailwind CSS + Lucide React 项目脚手架，落地 Stitch 设计系统「Ethereal Academy」的设计令牌，并提供全站共享的导航、页脚、Mock 数据类型与 Mock 钱包状态，作为其余全部前端 feature 的依赖基础。

## 项目信息

- 项目名: web3-university
- 架构类型: 单体仓库：Next.js 前端（纯 UI + Mock 交互）+ 独立 `contracts/` Solidity 示例目录（不产出接口，仅背景，本 feature 不涉及）

## 需求版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-12 | v1 | 初始需求 |
| 2026-08-13 | v2 | 用真实 Privy 登录 + 嵌入式钱包替换 Mock 钱包身份/连接/网络层，`ydBalance` 保留 Mock（不接入 YD 合约） |

## 用户故事

- 作为前端开发者，我想要一套配置好设计令牌的 Tailwind 主题，以便后续所有页面开发时视觉风格与 Stitch 设计稿保持一致，无需反复配置颜色/字体/圆角。
- 作为前端开发者，我想要一个可复用的全局导航和页脚组件，以便每个页面接入时不用重复开发。
- 作为前端开发者，我想要一个 Mock 钱包状态 Hook，以便在未接入真实 Privy/wagmi 的当前阶段，也能在 UI 上模拟「已连接/未连接」「切换网络」「YD 余额」等状态供各页面消费。

## 功能需求

1. [F-001] 使用 `create-next-app`（或等效方式）初始化 Next.js App Router 项目，启用 TypeScript、Tailwind CSS、ESLint，并安装 `lucide-react`。
2. [F-002] 按 Stitch 设计系统「Ethereal Academy」的 `design.md` 令牌（见 design.md）扩展 `tailwind.config` 主题：颜色（含 surface 分层、primary/secondary/tertiary、error）、字体族（Sora/Inter/JetBrains Mono）、圆角（sm/DEFAULT/md/lg/xl/full）、间距（8px 基准、container-max 1280px、gutter、stack-sm/md/lg）。
3. [F-003] 全局默认使用暗色模式外观（设计系统 `colorMode: DARK`），根布局设置对应的背景色与文本色 CSS 变量或 Tailwind class。
4. [F-004] 定义共享 Mock 数据 TypeScript 类型：`Course`、`Lesson`、`User`、`Certificate`、`Transaction`、`TeacherApplication`，并提供初始 fixtures 供各页面 feature 复用或扩展。
5. ~~[F-005] 提供 Mock 钱包状态 Hook/Context：暴露 `connected`、`address`、`ydBalance`、`network`（如 `sepolia`）、`connect()`、`disconnect()`、`setNetwork(network)`、`setYdBalance(amount)` 等纯前端模拟方法，不做任何真实钱包 SDK 调用。~~ `[v2 修改]` 用真实 Privy 登录 + 嵌入式钱包替换身份/连接/网络部分：`useWallet()` Hook/Context 暴露 `connected`（来自 Privy `authenticated`/`ready`，真实）、`address: string | null`（Privy 嵌入式钱包地址，**未登录时为 `null`**——与旧版本"恒为字符串"不同，所有消费方需补充判空处理）、`network: "sepolia" | "wrong-network" | null`（基于真实链 ID 判定）、`authError: string | null`（登录/切网失败时的错误信息）、`login()`（触发 Privy 登录模态框，替代旧 `connect()`）、`logout()`（替代旧 `disconnect()`）、`switchToSepolia()`（请求切换/添加 Sepolia 网络，替代旧 `setNetwork()`）。`ydBalance`/`setYdBalance(amount)` **保留不变**：继续作为独立于真实钱包的 Mock 状态（本次变更不接入 YD 合约，YD 余额与真实链上资产无关，仅供 Faucet 演示）。本次仅支持 **Email 登录**（不含短信/社交等其它 Privy 登录方式），登录后自动创建 **Ethereum** 嵌入式钱包，不支持连接外部钱包（MetaMask、WalletConnect 等）、不支持多钱包绑定。
6. [F-006] 实现全局 `TopNav` 组件：Logo/站名、主导航链接（首页/课程广场/老师工作台/Owner 后台）、钱包状态徽标（地址缩略 + 状态圆点）、网络徽标（Sepolia 胶囊）。`[v2 修改]` 徽标改为消费真实 `useWallet()`：未登录展示"登录"按钮（点击触发 `login()`）；登录中展示 loading 态；已登录展示嵌入式钱包地址缩略 + 绿色状态点；当前链非 Sepolia 时网络徽标切换为警示态且可点击触发 `switchToSepolia()`；`authError` 非空时在徽标旁展示简短错误提示。
7. [F-007] 实现全局 `Footer` 组件：条款/隐私政策/白皮书/文档链接、Sepolia Testnet 声明、版权信息。
8. [F-008] 在根布局（`app/layout.tsx`）中组装字体、主题、`TopNav`、`Footer`，并提供页面级骨架 loading 态的通用样式基础。`[v2 修改]` 新增 `PrivyProvider` 包裹应用（需要 `NEXT_PUBLIC_PRIVY_APP_ID` 环境变量），`ydBalance` 相关的轻量 Mock Provider 保留在 `PrivyProvider` 内层。

## 非功能需求

- 性能: 不引入未使用的第三方 UI 库；字体通过 `next/font` 或等效方式自托管，避免额外的外部请求阻塞渲染。
- 安全: ~~不引入任何真实密钥、RPC 端点或第三方 SDK 初始化代码（钱包连接为纯前端 Mock）。~~ `[v2 修改]` 引入真实第三方 SDK（`@privy-io/react-auth`），需要 `NEXT_PUBLIC_PRIVY_APP_ID` 环境变量，通过 `.env.local` 配置，提供 `.env.example` 模板；真实 App ID 不得提交仓库，遵循 `.claude/rules/security.md` 的环境变量管理约定。不引入任何真实私钥/助记词相关代码——Privy 嵌入式钱包的私钥由 Privy 托管，本仓库代码不接触私钥material。
- 兼容性: 支持桌面（≥1280px）、平板（768–1279px）、移动（<768px）三档断点，遵循设计系统的 12/8/4 列网格约定。

## 验收标准

- [ ] [AC-001] `npm run dev` 可正常启动，首屏无报错，能看到应用了设计系统配色的全局背景。
- [ ] [AC-002] `TopNav` 与 `Footer` 在任意页面引入根布局后均正确渲染，导航链接可跳转。
- [ ] [AC-003] `[v2 修改]` 真实 `useWallet()` 的 `login()`/`logout()` 能正确切换 `TopNav` 上的钱包状态徽标显示（含登录中 loading 态、已登录地址展示、退出后回到未登录态）。
- [ ] [AC-004] Tailwind 主题中的自定义颜色、字体、圆角、间距可在任意页面通过 class 直接使用（如 `bg-surface-container`、`font-headline`、`rounded-lg`）。
- [ ] [AC-005] 共享 Mock 数据类型可被其他 feature `import` 使用，无需重复定义。
- [ ] [AC-006] `[v2 修改]` `switchToSepolia()` 能正确请求切换网络，网络状态变化正确反映在 `TopNav` 网络徽标上；`setYdBalance()` 部分保持不变，可被其他 feature 调用构造「余额不足」等 Mock 场景。
- [ ] [AC-007] `[v2 新增]` 登录/切网失败时，`authError` 有对应文案在 `TopNav` 上可见（不是静默失败）。

## 依赖

- Stitch MCP（读取 `Web3 University UI 设计系统` 项目的设计系统令牌与页面截图，见 design.md）
- `[v2 新增]` Privy 应用：需要在 [Privy Dashboard](https://dashboard.privy.io/) 创建应用并获取 App ID，写入本地 `.env.local` 的 `NEXT_PUBLIC_PRIVY_APP_ID`（不属于本次 `/yd:prd` 产出范围，`/yd:ai` 执行到相关 task 时若环境变量缺失，应视为环境阻塞暂停等待用户提供，不得虚构假 ID）。

## 开放问题

- 无（当前阶段范围与技术选型已在用户指令中明确）。
- 无。Privy 登录方式已明确限定为仅 Email（`loginMethods: ["email"]`），不留待实现阶段自行决定。
