# Memory 索引

`/yd:ai` N2 判难度前按关键词匹配本索引；未命中再降级全文检索 `memory/*.md`。

- [eslint-config-next 16.x 是原生 flat config，不要用 FlatCompat 包装](eslint-config-next-16-flat-config.md) — ESLint flat config 循环 JSON 报错的根因与修法 | tags: eslint,eslint-config-next,flat-config,nextjs16,FlatCompat
- [Tailwind v4 用 @theme（CSS-first）落地设计令牌，无 tailwind.config.ts](tailwind-v4-css-theme-tokens.md) — 设计令牌命名空间对应关系与 container-max 的手写方案 | tags: tailwind,tailwindv4,design-tokens,theme,css
- [共享 Mock 钱包 Context 的完整 API 与消费方式](mock-wallet-context-api.md) — useMockWallet 的完整字段与跨 feature 复用方式 | tags: mock-wallet,wallet,context,useMockWallet,WalletProvider
- ["仅桌面显示" 元素必须同步设计移动端替代方案，否则 Codex Review 必抓](responsive-header-checklist.md) — 响应式导航/无障碍三类高频问题清单 | tags: responsive,mobile,accessibility,aria-label
- [从 localStorage 派生 SSR 安全状态用 useSyncExternalStore，不要用 useState+useEffect](use-sync-external-store-for-localstorage.md) — 规避 set-state-in-effect 规则，附跨 tab 同步实现 | tags: react,hooks,useSyncExternalStore,localStorage,hydration,set-state-in-effect
- [Mock 异步操作完成时必须重新校验前置条件](mock-async-revalidate-prereqs.md) — setTimeout 回调用 ref 重新校验，避免陈旧闭包提交失效副作用 | tags: react,mock,setTimeout,race-condition,stale-closure,wallet
- [改共享 mock fixture 定价前先确认记录是否已被其他 feature 引用](shared-fixture-price-scope.md) — design.md"若未收录"类判断落地前要 grep 验证，别只看目标 feature 是否已实现 | tags: mock-data,fixtures,pricing,shared-state,design-doc,scope
- [让 mockCourses 记录变成可点击详情入口前先确认 courseDetails.ts 有对应 fixture](course-detail-fixture-coverage.md) — 覆盖率缺口在早期 feature 潜伏，被后面暴露入口的 feature 触发 404 | tags: mock-data,fixtures,routing,course-detail,404,cross-feature
- [Stitch 原稿与 spec 摘要文案不一致时改动要双向可追溯](stitch-vs-spec-text-drift.md) — 代码注释指向 spec 段落 + design.md 补差异说明，不要只改一边 | tags: stitch,design-md,spec-drift,documentation,frontend
