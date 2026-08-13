---
title: 组件需要在某个 prop 变化时重置内部 state，用 key 重新挂载，不要在 useEffect 里同步 setState
feature: 5.learning-center
type: pitfall
tags: [react,hooks,key,useEffect,set-state-in-effect,reset-state]
date: 2026-08-13
---

**问题/场景**：`MockVideoPlayer.tsx` 需要在用户切换到下一课时把播放进度（`playing`/`elapsed`）重置为初始值。第一版实现用 `useEffect(() => { setPlaying(false); setElapsed(0) }, [title])`，触发 `eslint-plugin-react-hooks` 的 `set-state-in-effect` 规则报错：在 effect 里同步调用 setState 属于反模式，会导致多余的级联渲染。

**解法/结论**：调用方在渲染子组件时传 `key={依赖变化的那个值}`（本例是 `key={currentLesson.id}`），React 会在 key 变化时把组件当作全新实例重新挂载，`useState` 的初始值天然重新生效，完全不需要任何 `useEffect`。这是 React 官方文档推荐的"用 key 重置状态"（resetting state with a key）模式。

**复用方式**：任何组件需要在"某个 prop 变了 → 内部若干个 useState 都要回到初始值"的场景，优先看能不能让父组件传一个能代表"这是新的一份数据"的值作为 `key`（通常是数据的唯一 id），而不是写 `useEffect` 监听该 prop 后同步 setState。只有当"重置"逻辑比简单的"回到初始值"复杂（比如要保留部分状态、要做异步清理）时才考虑 effect 方案。
