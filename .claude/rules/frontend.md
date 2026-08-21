---
description: Next.js + TypeScript + Tailwind 前端开发规范（购买/完课/证书已接入本地 Anvil 真实合约，其余仍是 Mock）
paths:
  - "app/**"
  - "components/**"
  - "lib/**"
---

# 前端规范

## 技术栈

- Next.js（App Router）+ TypeScript + Tailwind CSS + Viem（链交互，`lib/contracts/`）。
- 已接入 Privy Email 登录和 Ethereum 嵌入式钱包；YD 余额、Faucet、课程购买、完课确认、NFT 证书已接入真实本地 Anvil 合约调用（`lib/contracts/`/`lib/purchase/`，见 `specs/14.contract-client-foundation/`~`specs/16.onchain-completion-certificate/`）。目标最终技术栈另含 Supabase（数据库）、Sepolia 部署，仍不在当前范围。

## 当前范围（严格遵守）

- Stitch 设计稿对应的 UI 已实现；课程购买/YD 余额/Faucet/完课确认/NFT 证书走真实链上读写，其余交互（视频播放、评论、老师/管理后台等）仍用本地假数据和 `useState`/`localStorage`。
- 已接入 Privy Email 登录和 Ethereum 嵌入式钱包（真实身份/连接/网络状态，见 `specs/10.wallet-auth-integration/`）。仅支持 Email 登录，不接外部钱包、MetaMask、WalletConnect；`NEXT_PUBLIC_PRIVY_APP_ID`/`TRUSTED_SUBMITTER_PRIVATE_KEY` 只通过环境变量读取，真实值只存在于本地 `.env.local`，`.env.example` 只能写占位符，后者必须是不带 `NEXT_PUBLIC_` 前缀的服务端专用变量（`app/api/complete-course/`）。不接入真实数据库（不写 Supabase 客户端代码）、不部署到本地 Anvil 以外的任何网络。
- 涉及真实合约调用的写操作遵循 `lib/contracts/txError.ts` 的标准顺序（`simulateContract` → `writeContract` → `waitForTransactionReceipt`）与统一错误映射；账户/课程切换时的查询键竞态需按 `lib/purchase/` 现有 Hook 的既有模式处理（见 `specs/15.onchain-token-course-purchase/design.md`/`specs/16.onchain-completion-certificate/design.md` 的多轮结构化复核记录），不要重新发明。
- 页面信息架构参考 `docs/PRD.md` 第 13 节（`/`、`/courses`、`/courses/[courseId]`、`/profile`、`/teacher`、`/admin`），但页面内容以 Stitch 设计稿为准，PRD 仅作业务背景参考。

## 设计稿还原（强制）

- **必须通过已配置的 Stitch MCP 工具读取原始设计稿数据**（如 `list_projects`/`get_project`/`list_screens`/`get_screen`）获取结构、间距、色值、文案等真实设计信息。
- **禁止仅凭截图或口头描述猜测样式细节**；截图仅可作为辅助确认整体观感，不能替代 Stitch MCP 返回的设计稿数据。
- 还原时优先使用设计稿中的设计系统（design system）信息映射到 Tailwind 配置（颜色、字体、圆角等），保持视觉一致性。

## 组件与状态

- 组件放在合理的 `components/` 子目录，页面级组件放在对应 `app/**/page.tsx`。
- Mock 数据集中管理（如 `lib/mock/` 或 `data/`），避免散落在各组件内的魔法数字/字符串。
- 组件 props 用 TypeScript `interface` 明确定义，避免隐式 `any`。
