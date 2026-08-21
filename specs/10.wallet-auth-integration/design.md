# Privy 钱包身份接入 — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-13 | v1 | 初始设计（集中实现 1/2/4/6 四个 feature 已记录的 v2 钱包身份变更） |
| 2026-08-20 | v1.1 | 标注：[[14.contract-client-foundation]] 已将本文档中"仅 Sepolia"的目标网络描述改为本地 Anvil（`switchToSepolia`→`switchToTargetChain`，`network: "sepolia"→"correct"`），Sepolia 部署是后续里程碑，本文档以下正文未逐处修改，以此条为准 |

## 项目架构

- 架构类型: 单体仓库，Next.js App Router
- 涉及层: 仅前端（`lib/wallet/`、`app/layout.tsx`、以及 1/2/4/6 四个 feature 已有组件的接入点修改），不新增页面/路由

## 与 1/2/4/6 四个 feature 的关系

本 feature **不重复**四个消费方 feature 各自 `requirements.md`/`design.md` 里已经写清楚的"为什么要改、改了哪个 F-ID"，那些记录保持原样、继续有效。本 feature 的 `design.md` 负责回答"具体怎么改、按什么顺序改、模块之间如何拼起来"，是这次变更唯一的任务执行入口。

| 消费方 feature | 受影响文件 | 对应本 feature 的任务 |
| --- | --- | --- |
| `1.project-foundation-design-system` | `lib/wallet/useMockWallet.tsx`（重命名重写）、`components/layout/TopNav.tsx`、`app/layout.tsx` | T-001、T-002、T-003、T-004 |
| `2.homepage` | `components/home/Hero.tsx` | T-005 |
| `4.course-detail-mock-purchase` | `components/course-detail/PurchasePanel.tsx`、`lib/purchase/usePurchaseFlow.ts` | T-006 |
| `6.profile-center` | 新建 `components/profile/LoginRequiredGate.tsx`、`app/profile/page.tsx`、`components/profile/ProfileHeader.tsx` | T-007 |

## 功能模块设计

### 模块 1: Privy 依赖与环境变量（T-001）

- 安装 `@privy-io/react-auth`（内部依赖 `viem`，随其一并安装）。
- `NEXT_PUBLIC_PRIVY_APP_ID` **仅通过 `process.env.NEXT_PUBLIC_PRIVY_APP_ID` 读取**，在 `PrivyProvider` 挂载处（模块 2）做一次存在性校验：缺失时不得用任何占位/假值兜底渲染，应抛出清晰的构建期或渲染期错误（如 `throw new Error("缺少 NEXT_PUBLIC_PRIVY_APP_ID，请在 .env.local 中配置")`），让开发者/CI 立刻发现，而不是让应用带着一个无效 App ID 静默跑起来产生难以诊断的运行时故障。
- 新增 `.env.example`：
  ```bash
  # Privy Dashboard（https://dashboard.privy.io/）创建应用后获取
  NEXT_PUBLIC_PRIVY_APP_ID=
  ```
  `.env.local` 保持不提交（`.gitignore` 已覆盖 `.env*` 排除示例文件），**不得**在任何提交中写入真实 App ID。

### 模块 2: `useWallet()` 统一适配层（T-002）

`lib/wallet/useMockWallet.tsx` → `lib/wallet/useWallet.tsx`（文件与导出符号一并重命名，删除 "Mock" 字样——身份/连接/网络已是真实数据，继续叫 Mock 会误导后续开发者）：

```ts
interface WalletState {
  connected: boolean                          // ready && authenticated
  address: string | null                       // wallets[0]?.address ?? null，未登录为 null
  network: "sepolia" | "wrong-network" | null   // 未登录为 null；已登录按当前 chainId 判定
  authError: string | null                      // login()/switchToSepolia() 失败时的错误信息
  login: () => void                             // 触发 Privy 登录模态框
  logout: () => Promise<void>
  switchToSepolia: () => Promise<void>
  ydBalance: number                             // 保留 Mock，与 Privy 状态完全独立
  setYdBalance: (amount: number) => void
}
```

`PrivyProvider` 配置：

```ts
{
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,   // 模块 1 已校验非空
  config: {
    loginMethods: ["email"],                       // 仅 Email 登录，不含 sms/social/外部钱包连接
    embeddedWallets: { createOnLogin: "users-without-wallets" }, // 自动为登录用户创建 Ethereum 嵌入式钱包
    defaultChain: sepolia,                          // viem/chains
    supportedChains: [sepolia],
    appearance: { theme: "dark", accentColor: "#7c3aed" },  // 贴近项目 primary 色；Privy 模态框本身样式由 SDK 托管，不做逐像素还原
  },
}
```

`ydBalance`/`setYdBalance` 用普通 `useState` 在同一个 `WalletProvider` 组件内维护，与 Privy 状态并列返回，消费方无需区分数据来源。

### 模块 3: `app/layout.tsx` 挂载 `PrivyProvider`（T-003）

`app/layout.tsx` 是 Server Component，`PrivyProvider` 必须在 Client Component 边界内——复用现有 `WalletProvider`（本身已是 `"use client"`）作为唯一的客户端包装层：`WalletProvider` 内部先渲染 `PrivyProvider`，再在其内层维护 `ydBalance` 状态并通过 Context 一并对外提供，避免新增额外文件/多层 Provider 嵌套。

### 模块 4: `TopNav.tsx` 接入真实状态（T-004）

- 未登录：展示"登录"按钮，`onClick={login}`。
- `!ready`（Privy 初始化中）或登录流程进行中：按钮 disabled + loading 指示（复用项目已有的 loading 视觉语言，如 `animate-pulse`/`Loader2` 图标）。
- 已登录：展示 `address` 缩略（复用现有 `truncateAddress` 辅助函数）+ 绿色状态点。
- `network === "wrong-network"`：网络徽标切换为警示配色，`onClick={() => switchToSepolia()}`。
- `authError` 非空：徽标旁展示一个小图标 + `title`/tooltip 显示错误文案，不打断其余 UI、不弹阻塞式弹窗。

### 模块 5: `Hero.tsx`（首页）接入真实登录（T-005）

「连接钱包」按钮 `onClick` 从 `wallet.connect` 改为 `wallet.login`；按钮态：未登录「连接钱包」、登录中禁用+loading、已登录展示 `address` 缩略。`address` 现在可能为 `null`，未登录/加载中统一按"未登录"UI 处理，不做解构失败风险的写法（如 `wallet.address?.slice(...)` 而非直接假设非空）。

### 模块 6: `PurchasePanel.tsx`/`usePurchaseFlow.ts`（课程详情）接入真实前置状态（T-006）

状态推导逻辑**代码层面基本不需要改**：`if (!wallet.connected) return "wallet-disconnected"` 与 `if (wallet.network !== "sepolia") return "wrong-network"` 对新类型依然成立（`!wallet.connected` 判断在前，未登录时不会走到 `network` 判断，不存在 `null` 被误判的问题）。需要改的只有：

1. import 路径 `@/lib/wallet/useMockWallet` → `@/lib/wallet/useWallet`
2. `wallet-disconnected` 态"连接钱包"按钮：`onClick={wallet.connect}` → `onClick={wallet.login}`
3. `wrong-network` 态"切换到 Sepolia"按钮：`onClick={() => wallet.setNetwork("sepolia")}` → `onClick={() => wallet.switchToSepolia()}`（`Promise<void>`，失败信息由 `authError` 在 `TopNav` 统一展示，此处不需要重复捕获/展示错误）

`insufficient-balance` 起的所有后续状态（Mock 余额、Faucet 领取、授权、购买、开始学习）完全不受影响，`recordPurchase`/`purchaseStore` 逻辑不改动。

### 模块 7: 个人中心登录门禁 + 真实地址（T-007）

- 新建 `components/profile/LoginRequiredGate.tsx`（视觉参考 `components/learning-center/PurchaseRequiredGate.tsx` 的既有模式：图标 + 提示文案 + 登录按钮）。
- `app/profile/page.tsx` 顶层读取 `wallet.connected`：`false` → 只渲染 `LoginRequiredGate`（不渲染 `ProfileHeader`/`ProfileTabs`/`EditUsernameModal` 中任何一个，门禁必须在渲染层面排除，不是渲染后用 CSS 隐藏）；`true` → 渲染完整内容。`ready` 为 `false` 期间同样落入门禁分支（Privy 的 `ready` 已内建在 `connected` 判定里），不需要额外的骨架屏。
- `ProfileHeader.tsx` 的 import 改为 `@/lib/wallet/useWallet`，读取真实 `address`（门禁已保证渲染到这里时必为已登录，可用非空断言或 `?? ""` fallback 处理类型）；`ydBalance` 继续读 Mock 值不变；用户名/角色徽标继续本地状态不变。

### 模块 8: 集成测试与响应式回归（T-008）

不产出新组件代码，人工联调 + 走查：

1. 完整流程：未登录访问各页面（确认门禁/未登录态正确）→ 登录 → 确认 TopNav/Hero/Profile 状态同步 → 若非 Sepolia 触发切网 → 走一遍课程购买流程确认不回归 → 退出登录 → 确认状态正确回落。
2. 三档断点（375/768/1280，参照 `9.responsive-visual-qa` 已建立的矩阵）逐页核查登录相关 UI。
3. 故意提供无效/缺失的 `NEXT_PUBLIC_PRIVY_APP_ID` 确认 AC-001 的报错行为符合预期。

**涉及层及关键设计（全 feature 通用）：**

- 全部客户端组件；真实状态来自 Privy SDK，`ydBalance` 继续是本地 `useState` 模拟，两者共存于同一个 `useWallet()` 返回值。
- 无持久化新增要求（Privy 自身处理登录态跨刷新保持；`ydBalance` 刷新后重置为初始 Mock 值，与变更前行为一致）。

## 接口契约

`lib/wallet/useWallet.tsx` 对外暴露的 `WalletState` 接口即唯一的"真实"接口边界（见模块 2），其余仍是组件 props 与本地 Mock 状态。无真实后端 API/RPC/合约接口——Privy SDK 内部与 Privy 云服务通信，本仓库不直接发起相关网络请求。

## 数据模型

无新增数据模型；复用 `1.project-foundation-design-system` 已定义的 `lib/mock/types.ts`。

## 安全考虑

- 遵循 `.claude/rules/security.md`：`NEXT_PUBLIC_PRIVY_APP_ID` 仅通过环境变量读取，真实值只允许存在于本地 `.env.local`（不提交仓库），`.env.example` 只能写占位符（如 `NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id`），不得写入真实值。
- Ethereum 嵌入式钱包私钥由 Privy 托管，本仓库代码不存储、不接触任何私钥或助记词。
- `NEXT_PUBLIC_` 前缀的环境变量会被打入客户端 bundle，这是 Privy App ID 的预期用法（App ID 本身设计为可暴露在客户端，真正的敏感操作由 Privy 后端与用户设备协同完成），不属于密钥泄露。
- 本次不接入 YD Token 合约、课程购买合约、Supabase——`ydBalance`/购买/证书等业务逻辑继续 100% Mock，只有"身份是谁、钱包地址是什么、当前在哪条链"变为真实。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 钱包身份/连接层实现 | Privy React SDK（`@privy-io/react-auth`），仅 Email 登录 + 自动创建 Ethereum 嵌入式钱包 | 用户指令明确指定；嵌入式钱包免去用户预装浏览器插件钱包的门槛；本阶段不做外部钱包连接（MetaMask/WalletConnect/多钱包绑定），缩小变更面 |
| `useMockWallet` → `useWallet` 重命名 | 正式改名，删除 `Mock` 字样 | 身份/连接/网络已是真实数据，继续叫 "Mock" 会误导后续开发者；改名代价（4 个消费方文件的 import 与调用同步修改）在本次变更范围内一次性付清 |
| `ydBalance` 是否随 Privy 一起重构 | 保留独立 Mock 状态，不接入任何真实数据源 | 用户明确本次不接入 YD 合约；拆开处理让变更边界清晰，且不影响 `4.course-detail-mock-purchase` 已实现的购买状态机后半段逻辑 |
| 登录门禁的组件结构 | 新建 `LoginRequiredGate.tsx`，视觉复用 `PurchaseRequiredGate.tsx` 模式，不做成共享抽象组件 | 两者文案/触发动作不同（登录 vs 购买），当前只有两处用到，抽公共组件属于当前阶段用不到的预先抽象 |
| 任务归属 | 全部实现任务集中在本 feature（10），不分散进 1/2/4/6 | 1/2/4/6 加上新任务后会超出单 feature 4-8 个任务的强约束（曾分别达到 12/7/9/10 个）；集中到独立 feature 既符合任务数约束，也让"这是一次统一的钱包身份切换"这件事在 specs 层面有一个清晰的单一执行入口 |
