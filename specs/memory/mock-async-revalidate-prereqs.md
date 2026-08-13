---
title: Mock 异步操作完成时必须重新校验前置条件，不能只信任发起时的闭包状态
tags: [react, mock, setTimeout, race-condition, stale-closure, wallet]
---

**问题**：用户点击按钮触发一个 Mock 异步操作（`setTimeout` 模拟 800-1500ms 网络延迟），操作发起时校验过前置条件（如钱包已连接、网络正确、余额充足）。但在等待期间，用户可能通过其他入口（如 `TopNav` 断开钱包）让前置条件失效。若 `setTimeout` 回调无条件提交副作用（`setState`、写入持久化记录等），会导致"发起时合法、完成时已失效"的操作被静默当作成功处理。

**解法/结论**：用一个 `ref` 持续同步最新的前置条件（在 `useEffect` 里随每次渲染更新），并在异步回调触发时重新校验，无效则放弃本次操作：

```ts
const prereqsRef = useRef({ connected, network, ydBalance, requiredBalanceYD });
useEffect(() => {
  prereqsRef.current = { connected, network, ydBalance, requiredBalanceYD };
}, [connected, network, ydBalance, requiredBalanceYD]);

function prereqsStillValid() {
  const p = prereqsRef.current;
  return p.connected && p.network === "sepolia" && p.ydBalance >= p.requiredBalanceYD;
}

// setTimeout 回调内：
setTimeout(() => {
  setIsApproving(false);
  if (prereqsStillValid()) {
    setIsApproved(true); // 只有前置条件仍成立才提交副作用
  }
  // 否则静默放弃，派生状态自然回落到当前真实前置条件对应的态
}, DELAY_MS);
```

**为什么不能只用闭包里的旧值**：`approve()`/`buy()` 发起时闭包捕获的是点击那一刻的 `state`，但 `setTimeout` 回调执行时可能已经过去了 1 秒多，这段时间里外部状态（钱包连接、网络、余额）随时可能变化。ref 提供的是"回调触发那一刻"的最新值，而不是"发起那一刻"的旧值。

**适用场景**：任何"用户触发 → Mock 异步等待 → 完成时提交副作用"的模式（购买、授权、铸造证书、教师审核提交等），只要等待期间外部状态可能被其他入口改变，就要套用这个 ref + 重新校验模式，不能假设等待期间状态不变。
