---
title: Stitch 原稿与 spec 摘要文案不一致时，改动要双向可追溯（代码注释 → spec 段落）
feature: 3.course-marketplace
type: decision
tags: [stitch,design-md,spec-drift,documentation,frontend]
date: 2026-08-13
---

**问题/场景**：`specs/3.course-marketplace/design.md` 把 Hero 摘要成"单句长标题"，但通过 `mcp__stitch__get_screen` 读取原始截图确认实际结构是"短标题 + 长副文案"两段式；难度筛选控件截图是下拉框、文案"所有难度/入门/进阶/专家"，为保持全站难度术语一致（`courseLevel.ts` 已用"初级/中级/高级"），实现改成了 Tab 按钮 + "全部/初级/中级/高级"。这些改动本身合理，但第一版只改了代码、没有同步 spec 文档，被 review 判定为"spec 与代码各说各话，且无 Stitch 二次确认记录"。

**解法/结论**：发现 Stitch 原稿（`get_screen`/截图）与既有 requirements.md/design.md 摘要不一致时，以 Stitch 原稿为准落地，但必须双向记录：1）代码里用简短注释说明"此处依据 Stitch MCP 二次核对，非拍脑袋改动"并指向 spec 里的具体段落；2）在 design.md 补一个"实现阶段二次核对发现的更新"小节，逐条写清楚差异点、Stitch 原稿实际是什么、为什么最终这样实现。两边都要能互相印证，不能只改一边。

**复用方式**：任何 feature 实现阶段重新读取 Stitch 原稿后，只要文案/结构/交互与 spec 摘要有出入，都套用这个"代码注释 + spec 补充小节"的双写模式；纯像素级细节（间距/圆角/颜色微调）不必如此郑重，仅对会影响用户可读文案或交互形式的差异这样处理。
