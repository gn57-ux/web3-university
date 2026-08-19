---
title: 验证第三方 SDK 的"当前官方 API"要读已安装包的类型定义，不要只信文档摘要
feature: 10.wallet-auth-integration
type: pitfall
tags: [privy, third-party-sdk, type-definitions, api-verification, node_modules]
date: 2026-08-13
---

**问题/场景**：实现 `useWallet()` 时按网络搜索到的 Privy 文档写了 `useLogout({ onSuccess, onError })`，`tsc --noEmit` 报错：`Object literal may only specify known properties, and 'onError' does not exist in type '{ onSuccess?: (() => void) | undefined; }'`。

**根因**：网络文档/训练数据描述的是某个版本的 API，项目实际安装的是 `@privy-io/react-auth@3.37.1`，这个具体版本的 `useLogout` 回调类型只有 `onSuccess`，没有 `onError`。次要来源（文档摘要、训练数据里的印象）和"当前实际安装版本"之间可能有细微但会导致编译失败的差异。

**解法**：直接 grep 已安装包的类型定义确认真实签名：

```bash
grep -n "useLogout" node_modules/@privy-io/react-auth/dist/dts/index.d.ts
# useLogout(callbacks?: PrivyEvents['logout'])
grep -n "logout" node_modules/@privy-io/react-auth/dist/dts/events-context-*.d.ts
# logout: { onSuccess?: () => void }  —— 确认没有 onError 字段
```

确认后移除 `onError`，改为在 `logout()` 包装函数里用 `try/catch` 兜底失败情况，复用项目已有的 `toErrorMessage()` 错误文案转换 helper。

**通用规则**：任何时候需要确认第三方 SDK 的"当前 API"，先看它实际编译产物里的 `.d.ts`（`node_modules/<pkg>/dist/dts/` 或类似路径），这是唯一对当前项目 100% 准确的真相来源；网络搜索/文档摘要只能作为初稿参考，写完代码后必须用这个方式复核一遍，而不是等 `tsc` 报错才去查。
