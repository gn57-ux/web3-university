# 项目脚手架与设计系统 — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-12 | v1 | 初始任务 |

## 项目信息

- 项目名: web3-university
- 架构类型: 单体仓库（Next.js 前端 + 独立 contracts/ 目录）
- specs 路径: specs/1.project-foundation-design-system/

## 任务列表

### 功能 1: 项目初始化

- [ ] T-001: Next.js App Router 项目初始化（TypeScript + Tailwind CSS + ESLint + lucide-react 依赖） ~30min

### 功能 2: 设计令牌

- [ ] T-002: 按 Stitch「Ethereal Academy」设计系统配置 Tailwind 主题令牌（颜色/圆角/间距/断点） ~30min
- [ ] T-003: 引入 Sora / Inter / JetBrains Mono 字体并配置全局暗色模式基底样式（背景色/文本色） ~15min

### 功能 3: Mock 基础设施

- [ ] T-004: 定义共享 Mock 数据类型与初始 fixtures（Course/Lesson/User/Certificate/Transaction/TeacherApplication） ~30min
- [ ] T-005: 实现 Mock 钱包状态 Hook/Context（connected/address/ydBalance/network/connect/disconnect/setNetwork/setYdBalance，后两者供消费方构造"错误网络"/"余额不足"场景） ~30min

### 功能 4: 全局布局

- [ ] T-006: 实现 TopNav 组件（Logo、导航链接、钱包状态徽标、网络徽标） ~30min
- [ ] T-007: 实现 Footer 组件（条款/隐私/白皮书/文档链接、Sepolia 声明、版权信息） ~15min
- [ ] T-008: 组装根布局 app/layout.tsx（字体、WalletProvider、TopNav、Footer、骨架 loading 基础样式） ~15min

## 依赖关系

- T-002、T-003 依赖 T-001（需先有可运行的 Next.js 项目才能配置 Tailwind/字体）
- T-006 依赖 T-005（导航栏钱包徽标需要消费 Mock 钱包 Hook）
- T-008 依赖 T-002、T-003、T-005、T-006、T-007（根布局组装所有基础设施）

## 风险点

- Tailwind 令牌命名若与后续 feature 实际用到的 class 不完全对应，需要在实现时按 `design.md` 的颜色/字体表逐项核对，避免遗漏（如 `surface-container-highest` 等深层级色未被用到就先跳过）。
- `next/font` 若无法直接获取 Sora/JetBrains Mono（非 Google Fonts 默认收录字体命名差异），需实现时通过 Stitch MCP 或设计系统 `designMd` 字段二次确认字体来源，必要时使用本地字体文件兜底。
