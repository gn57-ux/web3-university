---
title: 异步网络切换类操作要有独立 loading 标志并 disable 触发按钮
feature: 10.wallet-auth-integration
type: pitfall
tags: [react, async, loading-state, disabled, concurrency, switchChain]
date: 2026-08-13
---

**问题/场景**：`useWallet().switchToSepolia()` 包装了 Privy 嵌入式钱包的 `embeddedWallet.switchChain()`，是一次异步链上操作。第一版实现里 `TopNav`/`PurchasePanel` 的"切换到 Sepolia"按钮在等待期间保持可点击，没有任何 loading 反馈——Codex Review Round 1 判定为 P2：用户可以在第一次调用还没返回时重复点击，触发并发的 `switchChain()` 调用。

**根因**：只给了整体的 `loading`（`!ready || 正在登录中`）用于登录/登出场景，漏了"切网"这个同样是异步、同样需要防重复触发的操作。两者语义不同（一个是"整个钱包身份还没就绪"，一个是"正在切换网络，跟身份是否就绪无关"），不能合并成一个笼统的 `loading` 标志——那样连不相关的登录/登出按钮都会被误伤禁用。

**解法**：给 `switchToSepolia()` 单独加一个共享状态 `switchingNetwork: boolean`（跟 `authError`/`isAuthenticating` 一样放进内部 `MockLayerContext`，因为多个组件——`TopNav` 和 `PurchasePanel`——都可能触发同一次切网，需要同步感知进行中状态）：

```ts
const switchToSepolia = useCallback(async () => {
  if (!embeddedWallet || switchingNetwork) return;   // 守卫：进行中时忽略重复调用
  setSwitchingNetwork(true);
  try {
    await embeddedWallet.switchChain(sepolia.id);
    setAuthError(null);
  } catch (error) {
    setAuthError(toErrorMessage(error, "切换网络失败，请重试。"));
  } finally {
    setSwitchingNetwork(false);                        // finally 保证无论成功/失败都复位
  }
}, [embeddedWallet, switchingNetwork, setSwitchingNetwork, setAuthError]);
```

消费点用 `disabled={switchingNetwork}` + `Loader2` 图标 + "切换中..." 文案，而不是复用登录/登出的 `loading`。

**通用规则**：任何“点击触发异步操作、操作完成前不该被重复触发”的按钮，都要有专属于这个操作的 loading 标志（哪怕项目里已经有一个语义相近的全局 `loading`），并且用 `try/finally` 保证复位，不要依赖 `try/catch` 里分别在成功和失败分支各写一次复位逻辑（容易漏写一支）。
