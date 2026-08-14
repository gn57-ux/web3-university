---
description: Next.js + TypeScript + Tailwind 前端开发规范（当前为 Mock 交互阶段）
paths:
  - "app/**"
  - "components/**"
  - "lib/**"
---

# 前端规范

## 技术栈

- Next.js（App Router）+ TypeScript + Tailwind CSS。
- 当前阶段允许接入 Privy Email 登录和 Ethereum 嵌入式钱包；YD 余额、Faucet、课程支付及其他链上业务继续使用 Mock。目标最终技术栈另含 Viem（链交互）、Supabase（数据库），**均不在本阶段实现范围内**。

## 本阶段范围（严格遵守）

- 只实现 Stitch 设计稿对应的静态 UI 和 Mock 交互：页面布局、组件样式、状态切换（如 loading/已购买/未购买等按钮态）均可用本地假数据和 `useState`/内存 mock 实现。
- 当前阶段允许接入 Privy Email 登录和 Ethereum 嵌入式钱包（真实身份/连接/网络状态，见 `specs/10.wallet-auth-integration/`）；YD 余额、Faucet、课程支付及其他链上业务继续使用 Mock。仅支持 Email 登录，不接外部钱包、MetaMask、WalletConnect；`NEXT_PUBLIC_PRIVY_APP_ID` 只通过环境变量读取，真实值只存在于本地 `.env.local`，`.env.example` 只能写占位符。不接入真实数据库（不写 Supabase 客户端代码）、不发起真实合约调用（YD Token、课程购买、证书铸造等）。
- 涉及"购买课程"等业务交互时，用 mock 函数模拟异步流程（如 `setTimeout` + 状态切换）展示 UI 反馈，不接后端；"连接钱包"/登录/退出/切换网络走真实 Privy SDK。
- 页面信息架构参考 `docs/PRD.md` 第 13 节（`/`、`/courses`、`/courses/[courseId]`、`/profile`、`/teacher`、`/admin`），但页面内容以 Stitch 设计稿为准，PRD 仅作业务背景参考。

## 设计稿还原（强制）

- **必须通过已配置的 Stitch MCP 工具读取原始设计稿数据**（如 `list_projects`/`get_project`/`list_screens`/`get_screen`）获取结构、间距、色值、文案等真实设计信息。
- **禁止仅凭截图或口头描述猜测样式细节**；截图仅可作为辅助确认整体观感，不能替代 Stitch MCP 返回的设计稿数据。
- 还原时优先使用设计稿中的设计系统（design system）信息映射到 Tailwind 配置（颜色、字体、圆角等），保持视觉一致性。

## 组件与状态

- 组件放在合理的 `components/` 子目录，页面级组件放在对应 `app/**/page.tsx`。
- Mock 数据集中管理（如 `lib/mock/` 或 `data/`），避免散落在各组件内的魔法数字/字符串。
- 组件 props 用 TypeScript `interface` 明确定义，避免隐式 `any`。
