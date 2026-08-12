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

## 用户故事

- 作为前端开发者，我想要一套配置好设计令牌的 Tailwind 主题，以便后续所有页面开发时视觉风格与 Stitch 设计稿保持一致，无需反复配置颜色/字体/圆角。
- 作为前端开发者，我想要一个可复用的全局导航和页脚组件，以便每个页面接入时不用重复开发。
- 作为前端开发者，我想要一个 Mock 钱包状态 Hook，以便在未接入真实 Privy/wagmi 的当前阶段，也能在 UI 上模拟「已连接/未连接」「切换网络」「YD 余额」等状态供各页面消费。

## 功能需求

1. [F-001] 使用 `create-next-app`（或等效方式）初始化 Next.js App Router 项目，启用 TypeScript、Tailwind CSS、ESLint，并安装 `lucide-react`。
2. [F-002] 按 Stitch 设计系统「Ethereal Academy」的 `design.md` 令牌（见 design.md）扩展 `tailwind.config` 主题：颜色（含 surface 分层、primary/secondary/tertiary、error）、字体族（Sora/Inter/JetBrains Mono）、圆角（sm/DEFAULT/md/lg/xl/full）、间距（8px 基准、container-max 1280px、gutter、stack-sm/md/lg）。
3. [F-003] 全局默认使用暗色模式外观（设计系统 `colorMode: DARK`），根布局设置对应的背景色与文本色 CSS 变量或 Tailwind class。
4. [F-004] 定义共享 Mock 数据 TypeScript 类型：`Course`、`Lesson`、`User`、`Certificate`、`Transaction`、`TeacherApplication`，并提供初始 fixtures 供各页面 feature 复用或扩展。
5. [F-005] 提供 Mock 钱包状态 Hook/Context：暴露 `connected`、`address`、`ydBalance`、`network`（如 `sepolia`）、`connect()`、`disconnect()`、`setNetwork(network)`、`setYdBalance(amount)` 等纯前端模拟方法，不做任何真实钱包 SDK 调用。其中 `setNetwork`/`setYdBalance` 用于支持消费方（如 feature 4 购买面板）手动构造「错误网络」「余额不足」等 Mock 场景，不能仅靠 `connect`/`disconnect` 二元状态实现。
6. [F-006] 实现全局 `TopNav` 组件：Logo/站名、主导航链接（首页/课程广场/老师工作台/Owner 后台）、钱包状态徽标（地址缩略 + 状态圆点）、网络徽标（Sepolia 胶囊）。
7. [F-007] 实现全局 `Footer` 组件：条款/隐私政策/白皮书/文档链接、Sepolia Testnet 声明、版权信息。
8. [F-008] 在根布局（`app/layout.tsx`）中组装字体、主题、`TopNav`、`Footer`，并提供页面级骨架 loading 态的通用样式基础。

## 非功能需求

- 性能: 不引入未使用的第三方 UI 库；字体通过 `next/font` 或等效方式自托管，避免额外的外部请求阻塞渲染。
- 安全: 不引入任何真实密钥、RPC 端点或第三方 SDK 初始化代码（钱包连接为纯前端 Mock）。
- 兼容性: 支持桌面（≥1280px）、平板（768–1279px）、移动（<768px）三档断点，遵循设计系统的 12/8/4 列网格约定。

## 验收标准

- [ ] [AC-001] `npm run dev` 可正常启动，首屏无报错，能看到应用了设计系统配色的全局背景。
- [ ] [AC-002] `TopNav` 与 `Footer` 在任意页面引入根布局后均正确渲染，导航链接可跳转。
- [ ] [AC-003] Mock 钱包 Hook 的 `connect()`/`disconnect()` 能正确切换 `TopNav` 上的钱包状态徽标显示。
- [ ] [AC-004] Tailwind 主题中的自定义颜色、字体、圆角、间距可在任意页面通过 class 直接使用（如 `bg-surface-container`、`font-headline`、`rounded-lg`）。
- [ ] [AC-005] 共享 Mock 数据类型可被其他 feature `import` 使用，无需重复定义。
- [ ] [AC-006] Mock 钱包 Hook 的 `setNetwork()`/`setYdBalance()` 可被其他 feature 调用，用于构造「错误网络」「余额不足」等非默认 Mock 状态，且状态变化能正确反映在读取该 Hook 的任意组件（如 `TopNav` 网络徽标）上。

## 依赖

- Stitch MCP（读取 `Web3 University UI 设计系统` 项目的设计系统令牌与页面截图，见 design.md）

## 开放问题

- 无（当前阶段范围与技术选型已在用户指令中明确）。
