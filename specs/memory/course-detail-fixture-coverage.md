---
title: 让 mockCourses 记录变成可点击详情入口前，先确认 courseDetails.ts 有对应 fixture
feature: 3.course-marketplace
type: pitfall
tags: [mock-data,fixtures,routing,course-detail,404,cross-feature]
date: 2026-08-13
---

**问题/场景**：`lib/mock/fixtures.ts` 的 `mockCourses` 有 3 门课程，但 `lib/mock/courseDetails.ts`（feature 4 产物）最初只覆盖了其中 2 门的 `CourseDetail` fixture。feature 2（首页精选课程）恰好只暴露了这 2 门已覆盖的课程，从未触发问题。feature 3（课程广场）把 `mockCourses` 全部 3 条记录都渲染成指向 `/courses/{id}` 的可点击卡片，第三门课程「从零构建 Web3 DApp」点击后触发 `getCourseDetail()` 返回 `null` → `notFound()` → 404，属于典型的"覆盖率缺口在更早 feature 里潜伏，被后面的 feature 意外触发"。

**解法/结论**：任何 feature 只要会把 `mockCourses`（或其他共享课程列表）的某条记录渲染成指向 `/courses/{id}`（或其他依赖 `getCourseDetail`/类似查找函数的路由）的可点击入口，落地前先读一遍 `lib/mock/courseDetails.ts`（或对应的详情数据源）确认该 `id` 是否已有 fixture，不能假设"这门课已经在别的页面出现过就一定有详情页"。缺失时直接补齐（参考已有记录的字段结构：`description`/`requiredBalanceYD`/`curriculum`/`reviews`），不要留 404。

**复用方式**：新增任何"卡片/列表项点击跳转到详情页"的功能时，先用 `grep` 摸清跳转目标依赖的 mock 数据源覆盖了哪些 id，和列表数据源（如 `mockCourses`）的 id 集合做一次差集检查，缺的部分本次一起补齐。
