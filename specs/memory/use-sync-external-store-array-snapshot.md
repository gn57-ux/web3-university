---
title: useSyncExternalStore 的 getSnapshot 返回数组/对象时必须保证引用稳定，否则无限重渲染
feature: 6.profile-center
type: pitfall
tags: [react,hooks,useSyncExternalStore,localStorage,infinite-render,reference-equality]
date: 2026-08-13
---

**问题/场景**：`lib/purchase/useProfilePurchases.ts` 的 `getSnapshot` 直接返回 `getPurchases()`（内部 `JSON.parse(localStorage 内容)`）的结果。`JSON.parse` 每次调用都产出一个新数组对象，而 `useSyncExternalStore` 要求"底层数据不变时 `getSnapshot` 必须用 `Object.is` 判定为同一个值"，否则 React 会认为发生了变化并重渲染，重渲染时又拿到新引用，陷入无限重渲染循环（浏览器卡死，控制台刷屏 "The result of getSnapshot should be cached"）。本仓库此前两处 `useSyncExternalStore` 用法（`usePurchaseFlow.ts` 的 `isPurchased`、`LearningCenter.tsx` 的购课门禁）都没触发这个问题，因为它们的 `getSnapshot` 返回的是 `.some(...)` 算出的布尔值——原始类型天然引用/值稳定，不需要额外处理。

**解法/结论**：`getSnapshot` 一旦返回非原始类型（数组/对象），必须显式保证"底层数据不变则返回同一引用"。本例的修复是在数据源头（`lib/mock/purchaseStore.ts` 的 `readStorage()`）加一层按"上次读到的原始字符串"做的引用缓存：`localStorage` 里的字符串没变就直接返回上次的数组引用，变了才重新 `JSON.parse` 并更新缓存。

**复用方式**：写任何 `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` 时，先看 `getSnapshot` 的返回类型——原始类型（boolean/string/number）可以不管；返回数组/对象时，必须在数据源头维护引用缓存（按内容 hash 或原始字符串判断是否变化），不能指望调用方每次自己做记忆化（`useMemo` 依赖不稳定输入同样没用）。这是比"忘记 cleanup"更隐蔽的一类 bug，本地开发时不一定立刻触发（数据为空时不会进这个分支），要靠有真实数据的场景才会暴露，写完最好手动过一遍"有数据"的路径。
