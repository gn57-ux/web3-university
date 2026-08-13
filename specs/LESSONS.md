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

## 2026-08-12 — Feature 4 (course-detail-mock-purchase) / T-001~T-008

- **SSR 安全读取 localStorage 派生状态：用 `useSyncExternalStore`，不要用 `useState(false)` + `useEffect` 里 `setState` 恢复**。原始 design.md 方案是"初值 `false` 避免 hydration mismatch，挂载后 `useEffect` 里 `setState` 恢复"，实现时被 `eslint-plugin-react-hooks` 的 `set-state-in-effect` 规则拒绝（effect 内直接同步 setState 是被禁止的写法）。改为 `useSyncExternalStore(subscribePurchases, () => getPurchases().some(...), () => false)`：`getServerSnapshot` 恒返回 `false` 保证 SSR/首次渲染一致，写入后 store 内部 `notifyListeners()` 自动触发重渲染，副作用是不再需要额外的 `isRestoringPurchase` 骨架态标志。后续 feature（5 学习中心、6 个人中心）若也要从 `localStorage`/共享 Mock Store 派生"是否已购买"之类状态，直接复用这个模式，不要重新发明 `useState`+`useEffect` 方案。
- **Mock 异步操作必须在完成时重新校验前置条件，不能只信任发起时的闭包状态**：`usePurchaseFlow` 的 `approve()`/`buy()` 用 `setTimeout` 模拟 800-1500ms 网络延迟，若用户在等待期间断开钱包/切错网络/余额清零，原始实现会无条件地在 `setTimeout` 回调里 `setIsApproved(true)`/`recordPurchase(...)`，导致一笔发起时合法、完成时已失效的操作被静默记为成功——这是 Codex Review 第二轮抓到的问题。修复方式：用一个 `prereqsRef`（在 `useEffect` 里随每次渲染同步最新的 `wallet.connected`/`network`/`ydBalance`）+ `prereqsStillValid()` 校验函数，`setTimeout` 回调触发时先查这个 ref，无效则放弃本次操作（不写入购买记录、不置位 `isApproved`）。任何"用户点击后进入 Mock 异步等待，完成时才真正提交副作用"的模式都要套用这个模式，不能假设等待期间外部状态不变。
- **默认 Mock 余额必须与页面实际所需余额对得上，否则功能不可达**：feature 1 的 `mockCurrentUser.ydBalance` 默认 16 YD，本 feature 课程 `requiredBalanceYD` 设为 20 YD，且最初没有任何页面内 UI 能把余额从 16 提到 20——`insufficient-balance` 态只暴露了文案，没有可点击的 Faucet 按钮，导致用户通过页面本身永远无法完成购买（只能靠浏览器开发者工具手动改状态）。这是 Codex Review 第一轮抓到的问题，修复后 `requirements.md` 补充了 [F-008]："YD 余额不足"态必须提供页面内可点击的 Mock 领取按钮，`AC-002` 措辞也从"手动切换钱包状态"改为要求通过可见按钮完成整个流程。后续 feature 若引入任何"需要满足某个 Mock 前置条件才能继续"的场景，设计阶段就要确认默认 Mock 数据能否满足该条件，或提供页面内可达的调整入口，不要留给用户用开发者工具兜底。
- **共享 Mock Store 的跨 tab 同步**：`lib/mock/purchaseStore.ts` 除了写 `localStorage`，还维护一个 tab 内订阅者 `Set`（`subscribePurchases`/`notifyListeners`），因为浏览器原生 `storage` 事件只在**其他** tab 写入时触发，本 tab 内 `recordPurchase()` 后必须手动通知本 tab 内的 `useSyncExternalStore` 订阅者，否则同一个 tab 内购买后 UI 不会自动更新。`subscribePurchases` 内部同时注册了原生 `storage` 监听，两者叠加才能同时覆盖"本 tab 写入"和"其他 tab 写入"两种场景。

## 2026-08-13 — Feature 2 (homepage) / T-001~T-006

- **首页 `components/home/{Hero,StatsSection,LearningPath,FeaturedCourses}.tsx` 四模块实现**：`Hero` 直接消费根布局 `WalletProvider` 提供的 `useMockWallet()`（与 `TopNav` 共享同一 Context 实例），无需额外状态同步逻辑即满足"连接钱包后 TopNav 徽标同步"的验收标准；`FeaturedCourses` 按 design.md 决策不复用 feature 3 的 `CourseCard`，本地实现轻量卡片，价格/难度等权威字段直接从 `lib/mock/fixtures.ts` 的 `mockCourses` 读取（不在组件内重复定义），避免跨页面价格漂移。
- **design.md 写"若非 feature 3 已收录课程可自定价"时，务必先核对该课程是否已存在于其他 feature（尤其是 feature 1）的共享 fixtures 里，不能只看目标 feature 是否已实现**：`specs/2.homepage/design.md` 给「DeFi 与 Uniswap 实战」定价的指导是"若非 feature 3（课程广场）已收录的课程，可自行设更高档位价格"——但这门课其实早在 feature 1 就作为 `lib/mock/fixtures.ts` 的 `mockCourses[2]` 全局共享记录存在（原价 12 YD），只是 feature 3 尚未实现落地页面而已。首版实现误判"未收录"直接把它和 4 周入门课「Solidity 101」一起统一改成 4 YD，还顺手把范围外、本 feature 完全未引用的 `web3-dapp-from-zero`（8→4）也改了，被 `yd-code-reviewer` 判定为 P2（偏离 design.md 指导 + 未授权改动共享 fixture，可能影响未开发的 feature 3 定价假设）。修复：`web3-dapp-from-zero` 改回原价 8（未引用课程不应顺手改），`defi-uniswap-practical` 按 design.md「周期比例」指导设为 8 YD（8 周 = 4 周 Solidity 101 的 2 倍），并在 fixtures 注释写明依据；同步把 `lib/mock/courseDetails.ts` 里该课程的 `requiredBalanceYD` 从 4 改为 8（与 `priceYD` 对齐，购买门槛不应低于价格）。后续 feature 改动 `lib/mock/fixtures.ts` 里任何课程价格前，先 `grep` 确认该课程 `id` 有没有已被其他 feature（含未来才实现的 feature）引用，不要只看"当前哪个 feature 已经写了它的展示页面"。
