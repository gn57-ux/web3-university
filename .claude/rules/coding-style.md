---
description: 命名、格式与注释规范（TypeScript 前端 + Solidity 合约）
---

# 代码风格

项目尚无 ESLint/Prettier/Solhint 配置文件，以下规范基于社区惯例，初始化对应工具后以工具配置为准。

## TypeScript / Next.js（新增前端）

- 组件文件用 `PascalCase.tsx`，非组件模块用 `camelCase.ts`。
- 组件、类型用 `PascalCase`；变量、函数用 `camelCase`；常量用 `UPPER_SNAKE_CASE`。
- 全部使用 TypeScript，禁止新增 `.js`/`.jsx` 文件；避免 `any`，优先给 mock 数据定义明确的 `type`/`interface`。
- 优先使用具名导出；页面组件（`app/**/page.tsx`）保留默认导出。
- 使用 Tailwind CSS 工具类做样式，避免额外引入 CSS-in-JS 方案；不写行内 `style`，除非确有动态计算值。
- import 顺序：第三方库 → 项目内绝对路径别名 → 相对路径；同组内按字母序。

## Solidity（现有 `contracts/`）

- 延续现有文件风格：NatSpec 注释（`@title`/`@notice`/`@dev`）、`nonReentrant` 修饰符防重入、Checks-Effects-Interactions 顺序。
- 状态变量、事件、mapping 均需中文行内注释说明用途（与现有两个合约保持一致）。
- 不引入新的 Solidity 版本或第三方依赖，除非任务明确要求。

## 通用

- 中文注释仅在解释非显而易见的原因（隐藏约束、安全考量），不要复述代码在做什么。
- 不为当前阶段用不到的功能预留抽象或配置项。
