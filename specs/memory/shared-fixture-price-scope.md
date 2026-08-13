---
title: 改共享 mock fixture 定价前，先确认该记录是否已被其他 feature 引用（不只看目标 feature 是否已实现）
feature: 2.homepage
type: pitfall
tags: [mock-data,fixtures,pricing,shared-state,design-doc,scope]
date: 2026-08-13
---

**问题/场景**：`specs/2.homepage/design.md` 给精选课程「DeFi 与 Uniswap 实战」定价的指导是"若非 feature 3（课程广场）已收录的课程，可自行设更高档位价格"。但这门课其实早在 feature 1 就作为 `lib/mock/fixtures.ts` 的 `mockCourses[2]` 全局共享记录存在（原价 12 YD）——design.md 判断"是否已收录"时只看了目标 feature（3）是否已经把它做成落地页面，没有查共享 fixtures 文件本身是否已有该课程的规范记录。首版实现照 design.md 字面意思执行，把这门课和另一门本 feature 完全未引用的 `web3-dapp-from-zero` 一起统一改成 4 YD，被 review 判定为偏离 design.md 指导 + 未授权改动范围外课程。

**解法/结论**：改共享 mock fixture（`lib/mock/fixtures.ts` 等被多 feature 引用的文件）里任何已存在记录的字段前，先 `grep` 该记录的 `id`/字段名，确认：1）它是否已被其他 feature（含尚未实现落地页面、但已在 fixtures 里占了记录的 feature）引用；2）design.md 的"未收录/可自定义"类指导是否真的适用于这条已存在的记录，而不是想当然照抄。本例最终修复：未引用课程改回原价（不顺手改），已存在课程按 design.md 的"周期比例"原则重新定价并在 fixtures 注释写明依据，同时同步更新引用该课程 `priceYD` 的关联字段（如 `courseDetails.ts` 的 `requiredBalanceYD`，购买门槛不应低于价格）。

**复用方式**：任何 feature 要修改 `lib/mock/fixtures.ts`（或其他跨 feature 共享的 mock 数据文件）里的已存在记录时，先执行 `grep -rn "<courseId或字段>" lib/ app/ components/` 摸清引用范围，再决定是否可以按当前 feature 的 design.md 指导直接改；design.md 里"若未被 XX 收录"这类判断句，落地前都要用 grep 验证一次前提是否成立。
