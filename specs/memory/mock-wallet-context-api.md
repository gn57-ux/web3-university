---
title: 共享 Mock 钱包 Context 的完整 API 与消费方式
feature: 1.project-foundation-design-system
type: reusable
tags: [mock-wallet, wallet, context, useMockWallet, WalletProvider]
date: 2026-08-12
---

**问题/场景**：多个 feature（4 购买状态机、6 个人中心、7 老师工作台、8 Owner 后台）都需要读取/操作同一份 Mock 钱包状态（连接态、地址、YD 余额、网络），必须复用同一个 Context 而不是各自造轮子。

**解法/结论**：`lib/wallet/useMockWallet.tsx` 导出：

```ts
import { useMockWallet, WalletProvider } from "@/lib/wallet/useMockWallet";

const {
  connected,      // boolean
  address,        // string，固定测试地址（来自 lib/mock/fixtures.ts 的 mockCurrentUser）
  ydBalance,      // number
  network,        // "sepolia" | "mainnet" | "unsupported"
  connect,        // () => void
  disconnect,     // () => void
  setNetwork,     // (network: MockNetwork) => void — 供测试"错误网络"分支
  setYdBalance,   // (amount: number) => void — 供测试"余额不足"分支
} = useMockWallet();
```

`WalletProvider` 已在根布局 `app/layout.tsx` 全局包裹，任何页面/组件内直接 `useMockWallet()` 即可，不需要重新包 Provider。`useMockWallet()` 若在 `WalletProvider` 之外调用会抛错（有意为之，避免静默拿到 `undefined`）。

**复用方式**：
- feature 4 购买状态机：用 `setNetwork("unsupported")`/`setYdBalance(0)` 手动构造"错误网络"/"余额不足"分支进行验证，不要在购买面板组件内部重新发明网络/余额状态。
- feature 6/7/8：直接读 `address`/`connected` 判断展示态，不要各自 mock 一份假地址。
