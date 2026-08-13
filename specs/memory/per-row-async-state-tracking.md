---
title: 列表里每一行都能独立触发的异步操作，状态必须按行 key 追踪（Set/Map），不能用单个 useState
feature: 8.owner-admin-dashboard
type: pitfall
tags: [react,hooks,list,concurrency,loading-state,useState]
date: 2026-08-13
---

**问题/场景**：`CompletionConfirmation.tsx`（完课确认表格，每行一个"铸造 NFT"按钮）最初用单个 `mintingKey: string | null` + 单个 timer ref 追踪"当前哪一行在铸造中"。用户在第一行铸造未完成时点了第二行的按钮，`mintingKey` 切到第二行，第一行的 loading/disabled 态立刻消失并可被重复点击；组件卸载时的 cleanup 也只清得掉最后一个 timer，更早发起的 timer 仍会在卸载后触发 setState。

**解法/结论**：改用按行 key 索引的集合结构——`mintingKeys: Set<string>`（当前正在进行中的行的 key 集合）+ `mintTimers: Map<string, Timeout>`（每行一个 timer）。操作发起/完成时只增删自己那一行对应的条目，不影响其它行；`useEffect` 的 cleanup 遍历整个 Map 清空所有 timer，而不是只清一个。

**复用方式**：任何"一个列表里每一行/每一项都能独立触发一次带 loading 态的异步 Mock 操作"的场景（审核、铸造、批量操作、逐项提交等），追踪状态和定时器的数据结构必须是"按行唯一 key 索引的集合"（`Set`/`Map`/`Record<key, T>`），不能用单值 `useState`/单个 ref——单值结构只能正确表达"全局同时只有一件事在进行中"，用在"多行可并发触发"的场景会导致后触发的覆盖先触发的状态、以及 timer 泄漏（cleanup 清不干净）。
