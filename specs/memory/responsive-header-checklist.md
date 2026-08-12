---
title: "仅桌面显示" 元素必须同步设计移动端替代方案，否则 Codex Review 必抓
feature: 1.project-foundation-design-system
type: pitfall
tags: [responsive, mobile, accessibility, aria-label, hidden md:flex]
date: 2026-08-12
---

**问题/场景**：`TopNav` 首版用 `hidden md:flex` 隐藏桌面导航链接，移动端没有任何替代入口——Codex Review 连续抓出三个问题：(1) 移动端完全无法访问 `/courses`/`/teacher`/`/admin`；(2) 窄屏下 logo 文字+网络徽标+钱包按钮总宽度溢出视口；(3) 钱包按钮文字在小屏隐藏后，图标和状态点都是 `aria-hidden`，导致按钮对屏幕阅读器无障碍名称。

**解法/结论**：
1. 任何 `hidden md:flex`（或类似"仅桌面显示"）的导航类元素，必须同时加一个 `md:hidden` 的移动端替代（汉堡菜单 + 下拉面板是本项目采用的模式，见 `components/layout/TopNav.tsx`）。
2. 窄屏下用 `shrink-0`/`min-w-0`/隐藏次要文字（如 logo 文案降级为纯图标、"Sepolia" 降级为 "SEP"）而不是让 flex 容器溢出。
3. 图标按钮如果视觉文字在某断点被隐藏，必须补一个状态相关的 `aria-label`（而不是依赖被隐藏的 `<span>` 文本），例如 `aria-label={connected ? \`断开钱包连接 ${addr}\` : "连接钱包"}`。

**验证方法**：`npm run build` + `npm run lint` 只能保证类型/语法正确，不会抓到这三类问题；需要额外用 `curl` 抓取渲染后的 HTML 检查关键 class/aria 属性是否存在（如本 feature 用 `grep -o '打开导航菜单\|SEP\|md:hidden'`），或人工过一遍移动端断点。

**适用范围**：所有后续 feature 的页面级 header/导航/工具栏组件（尤其 feature 8 Owner 后台的侧边栏折叠、feature 6 个人中心的 Tab 横向滚动）。
**不适用范围**：纯展示性、无导航语义的装饰元素（如首页背景纹理）不需要遵循这个清单。
**可提升为稳定规则的条件**：若后续 feature 反复出现同类问题（≥2 次），可以把"新增 hidden md:flex 时必须同步移动端方案"写进 `.claude/rules/frontend.md`。
