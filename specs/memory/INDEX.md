# Memory 索引

`/yd:ai` N2 判难度前按关键词匹配本索引；未命中再降级全文检索 `memory/*.md`。

- [eslint-config-next 16.x 是原生 flat config，不要用 FlatCompat 包装](eslint-config-next-16-flat-config.md) — ESLint flat config 循环 JSON 报错的根因与修法 | tags: eslint,eslint-config-next,flat-config,nextjs16,FlatCompat
- [Tailwind v4 用 @theme（CSS-first）落地设计令牌，无 tailwind.config.ts](tailwind-v4-css-theme-tokens.md) — 设计令牌命名空间对应关系与 container-max 的手写方案 | tags: tailwind,tailwindv4,design-tokens,theme,css
- [共享钱包 Context 的完整 API 与消费方式（v2：真实 Privy 身份层 + Mock YD 余额）](mock-wallet-context-api.md) — useWallet 的完整字段、Privy CAIP-2/embeddedWallets/useLogout 版本坑、响应式与无障碍陷阱 | tags: wallet,privy,context,useWallet,WalletProvider,embedded-wallet
- [验证第三方 SDK 的"当前官方 API"要读已安装包的类型定义，不要只信文档摘要](privy-api-verify-against-installed-types.md) — useLogout onError 字段不存在的踩坑与修复方式 | tags: privy,third-party-sdk,type-definitions,api-verification,node_modules
- [异步网络切换类操作要有独立 loading 标志并 disable 触发按钮](async-action-needs-own-loading-flag.md) — 缺失时并发点击会重复发起底层调用，Codex Review 会抓 | tags: react,async,loading-state,disabled,concurrency,switchChain
- ["仅桌面显示" 元素必须同步设计移动端替代方案，否则 Codex Review 必抓](responsive-header-checklist.md) — 响应式导航/无障碍三类高频问题清单 | tags: responsive,mobile,accessibility,aria-label
- [从 localStorage 派生 SSR 安全状态用 useSyncExternalStore，不要用 useState+useEffect](use-sync-external-store-for-localstorage.md) — 规避 set-state-in-effect 规则，附跨 tab 同步实现 | tags: react,hooks,useSyncExternalStore,localStorage,hydration,set-state-in-effect
- [Mock 异步操作完成时必须重新校验前置条件](mock-async-revalidate-prereqs.md) — setTimeout 回调用 ref 重新校验，避免陈旧闭包提交失效副作用 | tags: react,mock,setTimeout,race-condition,stale-closure,wallet
- [改共享 mock fixture 定价前先确认记录是否已被其他 feature 引用](shared-fixture-price-scope.md) — design.md"若未收录"类判断落地前要 grep 验证，别只看目标 feature 是否已实现 | tags: mock-data,fixtures,pricing,shared-state,design-doc,scope
- [让 mockCourses 记录变成可点击详情入口前先确认 courseDetails.ts 有对应 fixture](course-detail-fixture-coverage.md) — 覆盖率缺口在早期 feature 潜伏，被后面暴露入口的 feature 触发 404 | tags: mock-data,fixtures,routing,course-detail,404,cross-feature
- [Stitch 原稿与 spec 摘要文案不一致时改动要双向可追溯](stitch-vs-spec-text-drift.md) — 代码注释指向 spec 段落 + design.md 补差异说明，不要只改一边 | tags: stitch,design-md,spec-drift,documentation,frontend
- [组件需要在 prop 变化时重置内部 state，用 key 重新挂载而非 useEffect 里 setState](reset-state-via-key.md) — set-state-in-effect 规则的正确规避方式 | tags: react,hooks,key,useEffect,set-state-in-effect,reset-state
- [同一课程的模块/章节标题在不同页面要复用同一份 fixture](lesson-title-consistency-across-pages.md) — 不要照抄 Stitch 截图的占位英文标题另起一套命名 | tags: mock-data,fixtures,consistency,course-detail,learning-center,stitch
- [useSyncExternalStore 的 getSnapshot 返回数组/对象时必须保证引用稳定](use-sync-external-store-array-snapshot.md) — 否则无限重渲染，源头加引用缓存 | tags: react,hooks,useSyncExternalStore,localStorage,infinite-render,reference-equality
- [本地回退演示数据的 UI 承诺不能超出其它 feature 真实业务门禁能兑现的范围](fallback-data-vs-real-gate-consistency.md) — 兜底数据的交互入口不能指向会被真实校验拦截的页面 | tags: mock-data,fallback,consistency,purchase-gate,cross-feature
- [next/image 渲染用户自由填写的外部图片 URL 会因域名不在白名单而崩溃](next-image-external-url-crash.md) — 本地资源用 next/image，用户输入的外部 URL 退化用 img | tags: nextjs,next-image,remote-patterns,user-input,crash
- [新建/编辑共用同一表单弹窗时必须单独设计"编辑非初始状态实体"的按钮行为](shared-form-modal-edit-vs-create.md) — 不能假设编辑态和新建态的可选操作集合完全一样 | tags: react,form,modal,state-machine,edit-vs-create
- [列表里每行独立触发的异步操作，状态必须按行 key 追踪（Set/Map）](per-row-async-state-tracking.md) — 单值 useState 会导致并发行互相覆盖 loading 态、timer 泄漏 | tags: react,hooks,list,concurrency,loading-state,useState
- [spec 文档内部自相矛盾时优先按 Stitch 原稿实现再回写 spec](spec-internal-contradiction-resolution.md) — 不要为凑字面合规推翻已确认合理的实现 | tags: spec-drift,design-md,requirements-md,documentation,stitch,review-conflict
- [共享布局组件的响应式断点问题要在断点数值本身附近精确测试](shared-layout-breakpoint-edge-cases.md) — 不能只测代表性宽度，TopNav 768px 空档区间案例 | tags: responsive,breakpoint,tailwind,shared-component,cross-feature,topnav
