---
title: eslint-config-next 16.x 是原生 flat config，不要用 FlatCompat 包装
feature: 1.project-foundation-design-system
type: pitfall
tags: [eslint, eslint-config-next, flat-config, nextjs16, FlatCompat]
date: 2026-08-12
---

**问题/场景**：`eslint.config.mjs` 用 `new FlatCompat().extends("next/core-web-vitals", "next/typescript")` 包装 `eslint-config-next`（沿用 Next 14/15 时代的常见写法），`npm run lint` 报错 `TypeError: Converting circular structure to JSON`，堆栈指向 `@eslint/eslintrc` 的 `config-validator.js` 在 `plugins.react` 处形成循环引用。

**解法/结论**：`eslint-config-next@16.x` 的 `package.json` `exports` 字段直接暴露 `./core-web-vitals`、`./typescript` 两个子路径，各自导出的是**原生 flat config 数组**（非 eslintrc 字符串），不需要也不能再用 `FlatCompat` 转换。正确写法：

```js
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
  ...nextCoreWebVitals,
  ...nextTypescript,
  { ignores: ["node_modules/**", ".next/**"] },
];
```

不再需要 `@eslint/eslintrc` 依赖。

**复用方式**：任何新 Next.js 16+ 子项目的 `eslint.config.mjs` 直接照抄上述写法。若未来 `eslint-config-next` 主版本变化，先 `cat node_modules/eslint-config-next/package.json` 的 `exports` 字段确认导出形态，再决定是否仍需 `FlatCompat`。
