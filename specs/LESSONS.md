# LESSONS

时间线记录：架构决策、踩坑、跨 feature 影响。`/yd:ai` N1 每次整份加载。

## 2026-08-12 — Feature 1 (project-foundation-design-system) / T-001~T-008

- **`create-next-app` 在本环境不可用**：`npx create-next-app@latest <dir>` 在此沙箱环境中，无论目标目录是否为空，总会在目标目录内先产生 `node-compile-cache/`、`update-check/` 两个自身写入的缓存目录，导致其自带的"目录冲突"检测总是失败并拒绝执行（即使目标目录调用前确认为空）。改为手写全部脚手架文件（`package.json`/`tsconfig.json`/`next.config.ts`/`postcss.config.mjs`/`eslint.config.mjs`/`app/`）+ `npm install` 规避，构建与 lint 均验证通过。后续 feature 若需要新增独立子项目，直接手写脚手架，不要依赖 `create-next-app`。
- **技术选型：Next.js 16 + React 19 + Tailwind v4**：`npm view` 查得的 registry 最新版本（2026-08-12）为 Next 16.3.0 / React 19.2.8 / Tailwind 4.3.3。采用 Tailwind v4 的 CSS-first 配置（`app/globals.css` 内 `@theme` 定义 `--color-*`/`--font-*`/`--text-*`/`--radius-*`/`--spacing-*`），**没有** `tailwind.config.ts` 文件——早期 spec 文档措辞（"扩展 tailwind.config 主题"）按此实现方式理解，不代表真的要生成该文件。
- **Next.js 16 自动生成 `AGENTS.md`/根 `CLAUDE.md`**：`next dev`/`next build` 首次运行会在仓库根目录写入 `AGENTS.md`（内容提示"这个版本可能不是你训练数据里认识的 Next.js，写代码前先读 `node_modules/next/dist/docs/`"）和 `CLAUDE.md`（内容仅 `@AGENTS.md`，通过 Claude Code 的文件导入语法生效）。**必须保留并提交这两个文件**（Next 官方文档明确要求"commit it with your work keeps the tree clean"）。后续 feature 遇到这两个文件被 `next dev` 重新写入/改动，不要删除，直接一并提交。
- **`eslint-config-next` 16.x 是原生 flat config 数组**，不再是需要 `FlatCompat().extends("next/core-web-vitals")` 包装的 eslintrc 字符串。用 `FlatCompat` 包装会在 `@eslint/eslintrc` 的 schema 校验阶段因插件对象自引用出现 `Converting circular structure to JSON` 崩溃。正确写法：
  ```js
  import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
  import nextTypescript from "eslint-config-next/typescript";
  export default [...nextCoreWebVitals, ...nextTypescript, { ignores: [...] }];
  ```
- **Next.js 16 破坏性变更（后续 feature 需注意）**：
  - 动态路由 `params`/`searchParams` 必须 `await`（Promise），feature 3/4/5 的 `app/courses/[courseId]/page.tsx`、`app/learn/[courseId]/page.tsx` 等动态路由页面实现时需用 `export default async function Page(props: PageProps<'/courses/[courseId]'>) { const { courseId } = await props.params }` 写法，不能同步解构。
  - `next lint` 命令已移除，`package.json` 的 `lint` 脚本必须直接调用 `eslint .`（本 feature 已这样配置）。
  - `next.config.ts` 若需要 Turbopack 专属配置，用顶层 `turbopack` 字段，不是 `experimental.turbopack`。
- **规范课程定价**：`docs/PRD.md` 与 specs/4 的示例定价均为 4 YD，`lib/mock/fixtures.ts` 中导出了 `SOLIDITY_101_PRICE_YD = 4` 常量与 `id: "solidity-101"` 课程记录，后续 feature（2 首页精选课程、3 课程广场、4 课程详情）引用「Solidity 智能合约入门」时必须复用该 `id`/价格，不得各自编造，避免用户从不同页面看到不同价格（此前已在 spec review 阶段修正过一次）。
- **导航目标先占位**：`TopNav` 链接到 `/courses`、`/teacher`、`/admin`，Footer 链接到 `/terms`、`/privacy`、`/whitepaper`、`/docs`。前三个已建最小占位页（`app/courses|teacher|admin/page.tsx`，待 feature 3/7/8 覆盖实现）；后四个 Footer 链接**未建占位页**，是本 feature 最后一轮 Codex Review（4/4 轮已达上限）指出但经用户确认接受的已知限制——这四个页面不在任何 feature 的 specs 范围内（PLAN.md 没有对应 feature），故意不建。
- **Mock 钱包 Context API**：`lib/wallet/useMockWallet.tsx` 导出 `useMockWallet()` 与 `WalletProvider`，状态含 `connected/address/ydBalance/network/connect/disconnect/setNetwork/setYdBalance`。`setNetwork`/`setYdBalance` 是 spec review 阶段专门为 feature 4 的"错误网络"/"余额不足"购买态追加的，feature 4 实现购买状态机时直接调用这两个方法构造对应场景，不要重新发明。
- **响应式 Header 教训**：`TopNav` 首版桌面态 OK，但移动端曾出现"导航链接完全消失且无替代入口""窄屏溢出""图标按钮无 aria-label"三类问题，均被 Codex Review 抓到。后续 feature 新增任何"仅桌面显示"的元素（`hidden md:flex` 之类），必须同时想清楚移动端替代方案（汉堡菜单/收窄/图标化），不要等审查后再补。
