---
title: 共享钱包 Context 的完整 API 与消费方式（v2：真实 Privy 身份层 + Mock YD 余额）
feature: 10.wallet-auth-integration
type: reusable
tags: [wallet, privy, context, useWallet, WalletProvider, embedded-wallet]
date: 2026-08-13
---

**问题/场景**：Feature 10 把 Feature 1 引入的纯 Mock 钱包层（`useMockWallet`）替换为真实 Privy 登录 + 自动创建的 Ethereum 嵌入式钱包（Sepolia），同时 `ydBalance`（课程购买用的 Mock YD 余额）必须继续独立于真实链上状态存在。多个消费点（`TopNav`、`Hero`、`PurchasePanel`/`usePurchaseFlow`、`ProfileHeader`、`/profile` 门禁）都要读同一份状态，必须复用同一个 Hook 而不是各自读 Privy 原始 Hook。

**解法/结论**：`lib/wallet/useWallet.tsx` 导出：

```ts
import { useWallet, WalletProvider } from "@/lib/wallet/useWallet";

const {
  connected,         // boolean — ready && authenticated（Privy 原生状态）
  loading,           // boolean — !ready || 正在登录中（modal 打开到 onComplete/onError 之间）
  switchingNetwork,  // boolean — switchToSepolia() 调用进行中，供切网按钮单独禁用
  address,           // string | null — 嵌入式钱包地址，未登录/钱包未就绪时为 null
  network,           // "sepolia" | "wrong-network" | null
  authError,         // string | null — 登录/登出/切网失败的错误文案
  login,             // () => void
  logout,            // () => Promise<void>
  switchToSepolia,   // () => Promise<void>
  ydBalance,         // number — 独立于真实钱包的 Mock 演示余额，不接入 YD 合约
  setYdBalance,      // (amount: number) => void
} = useWallet();
```

`WalletProvider` 已在根布局 `app/layout.tsx` 全局包裹（内部先挂载 `PrivyProvider`，再挂载内层的 Mock 状态 Provider），任何页面/组件内直接 `useWallet()` 即可。若在 `WalletProvider` 之外调用会抛错。若 `NEXT_PUBLIC_PRIVY_APP_ID` 环境变量缺失，`WalletProvider` 会直接抛错而不是用假值渲染。

**架构要点**：
- `connected`/`address`/`network`/`login`/`logout`/`switchToSepolia` 直接读/包装 Privy 自身的全局状态（`usePrivy()`/`useWallets()`/`useLogin()`/`useLogout()`），不需要额外包一层 Context——Privy 内部已是单例。
- `ydBalance`/`authError`/`isAuthenticating`/`switchingNetwork` 才需要一个内部 `MockLayerContext`：它们要跨组件共享（例如 Hero 发起的登录，TopNav 也要同步看到 loading/错误），如果只是 `useWallet()` 内部的局部 `useState`，每个消费组件会各自持有一份互不同步的状态。
- `network` 判定用 CAIP-2 格式比较：`embeddedWallet.chainId === \`eip155:${sepolia.id}\``（Privy 的 `wallet.chainId` 是 CAIP-2 字符串，而 `wallet.switchChain()` 接收的是纯数字 chainId——两个 API 格式不同，别混用）。
- `embeddedWallets` 配置字段要嵌套在 `ethereum` 下：`{ ethereum: { createOnLogin: "users-without-wallets" } }`，扁平写法在当前安装版本类型不匹配。
- `useLogout()` 的回调形状只有 `onSuccess`（当前安装的 `@privy-io/react-auth@3.37.1` 没有 `onError` 字段），失败情况要在 `logout()` 包装函数里自己 `try/catch`。
- **验证方式**：Privy 的"当前官方 API"以实际安装包的类型定义为准（`node_modules/@privy-io/react-auth/dist/dts/*.d.ts`），不要只信网络文档摘要——次要来源可能与具体安装版本的真实签名有偏差。

**复用方式**：
- 课程购买状态机（`usePurchaseFlow`）：`!wallet.connected` → `wallet-disconnected`，`wallet.network !== "sepolia"` → `wrong-network`，`wallet.ydBalance < requiredBalanceYD` → `insufficient-balance`。用 `wallet.setYdBalance(x)` 手动构造"余额不足"分支进行验证，不要在购买面板组件内部重新发明余额状态。
- `/profile` 门禁：必须在渲染层面用 `if (!connected) return <LoginRequiredGate ... />` 提前 return，不能渲染后用 CSS 隐藏——否则未登录用户能在开发者工具里看到完整资料结构。
- 实测（grep 全项目）：目前只有 6 个文件消费这个 Hook——`app/layout.tsx`、`components/layout/TopNav.tsx`、`components/home/Hero.tsx`、`components/course-detail/PurchasePanel.tsx`、`components/profile/ProfileHeader.tsx`、`lib/purchase/usePurchaseFlow.ts`。**老师工作台（feature 7）/Owner 后台（feature 8）当前并不消费这个 Hook**（旧版本此文件曾错误声称它们消费，已在 v2 修正）。

**UI 陷阱（Codex Review 抓到过）**：
- 响应式：网络徽标/切网按钮不要用 `hidden ... sm:flex` 包住整个元素——会导致小于 640px 时完全消失。正确做法是元素本身始终渲染，内部用 `hidden sm:inline`/`sm:hidden` 两个 span 切换全称/缩写文案。
- 无障碍：`authError` 类的状态提示不能只放在 `title` 属性里配一个 `aria-hidden` 图标——触屏设备摸不到 hover，屏幕阅读器也读不到。要有真实可见的文本节点（可配合 `role="alert"`），`title` 只能是锦上添花的补充。
- 异步操作（如 `switchToSepolia()`）必须有独立的 loading 标志（`switchingNetwork`）并 disable 触发按钮，否则并发点击会重复发起底层调用。
