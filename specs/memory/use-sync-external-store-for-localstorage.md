---
title: 从 localStorage 派生 SSR 安全状态用 useSyncExternalStore，不要用 useState+useEffect
tags: [react, hooks, useSyncExternalStore, localStorage, hydration, set-state-in-effect, eslint]
---

**问题**：需要一个从 `localStorage`（或其他外部可变数据源）派生的布尔/对象状态，且要求：(1) 服务端渲染与客户端首次渲染结果一致，不产生 hydration mismatch；(2) 外部数据源变化时组件能自动重渲染。

**曾经的错误方案**：`useState(false)` 初始化 + `useEffect(() => { if (条件成立) setState(true) }, [])` 在挂载后恢复真实值。这在 `eslint-plugin-react-hooks` 的 `set-state-in-effect` 规则下会被拒绝——"在 effect 内直接同步 setState" 是禁止写法。

**解法/结论**：改用 `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`：

```ts
const isPurchased = useSyncExternalStore(
  subscribePurchases,               // 订阅函数：注册监听器，返回取消订阅函数
  () => getPurchases().some((r) => r.courseId === courseId), // 客户端快照
  () => false                       // 服务端快照，恒定值，避免 mismatch
);
```

- `getServerSnapshot` 恒返回一个固定值（如 `false`），保证 SSR 输出与客户端首次渲染一致。
- 数据源变化时（如 `localStorage` 写入后）调用 `subscribe` 传入的 listener，`useSyncExternalStore` 会自动重渲染，不需要手动 `setState`。
- 这是 React 官方为"读取外部可变状态且需要 SSR 安全初始值"场景推荐的模式，天然规避 `set-state-in-effect`，也不再需要额外的"恢复中"骨架态标志（`isRestoringPurchase` 之类）。

**跨 tab 同步的配套实现**：浏览器原生 `storage` 事件只在**其他** tab 写入时触发，本 tab 内写入后必须手动维护一个订阅者集合并调用 `notifyListeners()`。参考 `lib/mock/purchaseStore.ts` 的 `subscribePurchases`/`notifyListeners` 实现：内部 `Set<Listener>` 处理本 tab 通知，同时 `window.addEventListener("storage", listener)` 处理跨 tab 通知。

**适用场景**：任何"读取 `localStorage`/`sessionStorage`/全局单例 Mock Store 派生 UI 状态"的 Hook，都应该走这个模式，而不是 `useState` + `useEffect`。
