---
title: next/image 渲染用户自由填写的外部图片 URL 会因域名不在白名单而崩溃
feature: 7.teacher-workspace
type: pitfall
tags: [nextjs,next-image,remote-patterns,user-input,crash]
date: 2026-08-13
---

**问题/场景**：老师工作台的"提交新课程"表单允许老师填任意外部图片 URL 作为课程封面。课程卡组件最初无差别用 `next/image` 渲染所有 `coverUrl`（本地 mock 封面和用户自填的外部 URL 都一样处理）。项目 `next.config.ts` 没有配置 `images.remotePatterns`/`domains`，`next/image` 遇到不在白名单里的域名会直接抛运行时错误，导致整个页面崩溃——不是视觉降级，是硬性崩溃。

**解法/结论**：按来源区分处理——本地 `public/` 目录下的资源（路径以 `/` 开头）继续用 `next/image`（享受优化）；用户/Mock 表单自由输入的外部 URL 改用普通 `<img>` 标签（不受 `next/image` 的远程域名白名单限制），并加 `onError` 兜底（加载失败时隐藏，避免显示破图图标）。

**复用方式**：任何"允许用户或 Mock 表单自由输入图片 URL 并渲染"的场景，先确认这些 URL 会不会流向 `next/image`。若会，要么在 `next.config.ts` 显式配置 `images.remotePatterns`（真实生产场景，需要控制信任的域名列表），要么对不可控来源的 URL 一律退化为普通 `<img>`（Mock/演示场景更简单，无需维护域名白名单）。判断依据很简单：这个 URL 的域名是我方能提前枚举的（本地资源、已知 CDN）就能用 `next/image`；用户能自由输入就不能无条件用。
