---
title: 同一课程的模块/章节标题在不同页面必须复用同一份 fixture，不要照抄 Stitch 截图另起一套
feature: 5.learning-center
type: decision
tags: [mock-data,fixtures,consistency,course-detail,learning-center,stitch]
date: 2026-08-13
---

**问题/场景**：`lib/mock/courseDetails.ts`（feature 4）已经为每门课程写好了 5 条中文 `curriculum`（课程详情页的大纲预览）。feature 5（学习中心）对应的 Stitch 截图里，章节列表用的是完全不同的英文占位标题（"Introduction to Blockchain" 等），与已有的中文大纲标题对不上——这类占位内容通常是 Stitch 生成截图时的通用示例文案，不代表项目的真实课程结构。如果照抄截图标题实现学习中心的章节列表，会导致同一门课在"课程详情"和"学习中心"两个页面看到两套完全不同的模块名，是与本项目已反复强调的"同一课程不同页面不能有不同说法"同类问题（价格一致性、难度术语一致性）。

**解法/结论**：学习中心的 `Lesson[]` fixture 标题直接复用 `courseDetails.ts` 对应课程的 `curriculum` 标题（同一 id 前缀、同一中文文案），不采用 Stitch 截图的占位英文标题。Stitch 截图仍用于确认视觉结构（勾选/播放/锁定三态图标、进度条样式），但具体的模块命名以项目已有的规范 fixture 为准。

**复用方式**：任何 feature 要展示"同一课程的模块/章节/单元列表"时，先检查 `lib/mock/courseDetails.ts`（或其他已有课程结构 fixture）里是否已经定义过这批内容，复用其标题/顺序，而不是重新读 Stitch 截图另起一套命名。只有当现有 fixture 完全没有覆盖过这门课程的模块结构时，才需要新写一套，且要保证与该课程未来在其他页面出现的结构描述留有对齐空间。
