---
title: Tailwind v4 用 @theme（CSS-first）落地设计令牌，无 tailwind.config.ts
feature: 1.project-foundation-design-system
type: decision
tags: [tailwind, tailwindv4, design-tokens, theme, css]
date: 2026-08-12
---

**问题/场景**：`specs/1.project-foundation-design-system/design.md` 的措辞是"在 `tailwind.config.ts` 的 `theme.extend` 中落地颜色/字体/圆角/间距"，但项目实际安装的是 Tailwind v4（`npm view tailwindcss version` 在 2026-08-12 返回 4.3.3），v4 默认走 CSS-first 配置，没有 `tailwind.config.ts` 文件。

**解法/结论**：在 `app/globals.css` 用 `@theme { ... }` 块定义所有设计令牌，命名空间对应关系：

- `--color-*` → `bg-*`/`text-*`/`border-*` 等颜色 utility（如 `--color-surface-container` → `bg-surface-container`）
- `--font-*` → `font-*` 字体族 utility（覆盖了 `--font-sans`/新增 `--font-heading`/覆盖 `--font-mono`）
- `--text-{name}` + `--text-{name}--line-height`/`--font-weight`/`--letter-spacing` → 复合排版 utility（如 `text-display` 同时带字号/行高/字重/字距）
- `--radius-*`（含裸 `--radius` 对应 `rounded`） → `rounded-*`
- `--spacing-{name}` → 可用于 `p-*`/`m-*`/`gap-*` 等间距 utility 的新增具名档位（如 `--spacing-stack-md` → `gap-stack-md`）

`container-max`（1280px 最大宽度容器）没有直接对应的 v4 命名空间，改用手写 `.container-app` CSS class（`max-width` + `margin-inline: auto` + 响应式 `padding-inline`）。

**复用方式**：后续 feature 需要新增设计令牌（如 feature 6 的证书虹彩边框渐变色），直接在 `app/globals.css` 的 `@theme` 块里加，不要新建 `tailwind.config.ts`。查当前完整令牌列表直接读 `app/globals.css`。
