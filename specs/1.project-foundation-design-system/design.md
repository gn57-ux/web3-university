# 项目脚手架与设计系统 — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-12 | v1 | 初始设计 |
| 2026-08-13 | v2 | Mock 钱包身份/连接/网络层 → 真实 Privy 登录 + 嵌入式钱包 |

## 项目架构

- 架构类型: 单体仓库，Next.js App Router 前端位于仓库根目录（或约定的 `frontend/` 子目录，实现时按 `.claude/CLAUDE.md` 最终确认路径）
- 涉及层: 仅前端（页面组件、全局布局、Tailwind 配置、纯前端 Mock 状态），无后端/数据库/合约调用

## Stitch 设计稿来源（本 feature 的视觉依据）

通过 Stitch MCP 读取，项目 `Web3 University UI 设计系统`（`projects/8237832631308458514`），设计系统 `Ethereal Academy`：

> 实现阶段必须再次通过 Stitch MCP（`get_project` / `list_design_systems` / `get_screen`）读取原始设计稿确认令牌与像素细节，不得仅依赖本文档摘要。

### 品牌与视觉基调

「现代数字大学」叙事：学术严谨性 + 去中心化技术的先锋感。视觉风格融合 Corporate Modern 与 Glassmorphism：深色稳定背景 + 半透明层 + 低强度光晕（low-glow）。背景可叠加低透明度（3-5%）的 SVG 网格/节点连线纹理以呼应「知识互联」主题。

### 颜色令牌（暗色模式）

| Token | 值 | 用途 |
| --- | --- | --- |
| `background` / `surface` | `#0f131f` | 页面基底背景（Level 0 更深：`#0a0e1a`） |
| `surface-container-lowest` | `#0a0e1a` | 最底层背景 |
| `surface-container-low` | `#171b28` | 次级容器背景 |
| `surface-container` | `#1b1f2c` | 卡片/面板默认背景（1px 边框 `#2D3748`） |
| `surface-container-high` | `#262a37` | 弹层/浮层背景（Level 2，边框 `#3F4E6B`） |
| `surface-container-highest` | `#313442` | 最高层级容器 |
| `on-surface` | `#dfe2f3` | 主文本色 |
| `on-surface-variant` | `#ccc3d8` | 次要文本色 |
| `outline` / `outline-variant` | `#958da1` / `#4a4455` | 边框、分隔线 |
| `primary` (on-dark) | `#d2bbff` | 主色文本/图标（对应容器色 `primary-container` `#7c3aed` 紫罗兰，按钮实心色） |
| `secondary` | `#4edea3`（容器 `#00a572`/`#10b981`） | 薄荷绿，仅用于正向反馈/进度/交易成功态 |
| `tertiary` | `#ffb95f`（容器 `#905b00`/`#f59e0b`） | 琥珀色，用于代币/余额/Premium 标识 |
| `error` | `#ffb4ab`（容器 `#93000a`） | 错误态 |

### 字体（三字体策略）

| 用途 | 字体 | 说明 |
| --- | --- | --- |
| 标题/展示文本 | **Sora** | `display` 48px/700，`headline-lg` 32px/600，`headline-md` 24px/600（移动端 `display` 降至 32px，`headline-lg` 降至 24px） |
| 正文/UI 控件 | **Inter** | `body-lg` 18px/400，`body-md` 16px/400 |
| 标签/数据（钱包地址、交易哈希、网络状态、表头） | **JetBrains Mono** | `label-md` 14px/500 letter-spacing 0.05em，`code-sm` 12px/400 |

### 布局与间距

- 8px 基准网格；容器最大宽度 1280px。
- 桌面：12 列，24px 间距（gutter）。平板：8 列，20px 间距。移动：4 列，16px 边距（margin）。
- 垂直节奏：`stack-sm` 12px（label+input 等紧密关联元素）、`stack-md` 24px（卡片间距）、`stack-lg` 48px（区块间距）。内容密度整体偏「宽松（Roomy）」。

### 圆角

- 卡片/主容器：`rounded-lg`（16px，即 `xl` token `1.5rem` 或 `lg` `1rem`，实现时以 `md`=0.75rem/`lg`=1rem 为准，具体取值见下方 Tailwind 扩展）。
- 按钮/输入框/复选框：`rounded-md`（8px）。
- 状态徽标（网络徽标、钱包状态）：`rounded-full`（Pill 形状），与可点击按钮做形状区分。

### 关键可复用组件规范

- **钱包状态徽标**：地址用 JetBrains Mono 缩略显示（如 `0x123...abc`），旁边圆形状态点（绿色=已连接，红色=未连接）。
- **网络徽标**：小号半透明 Pill，显示 `Sepolia` 或 `Mainnet`，置于视口右上角导航区。
- **两阶段交易按钮**（供 feature 4 使用，此处仅定义基础按钮样式令牌）：默认态为实心紫罗兰主按钮，白色文本，8px 圆角；完成态使用薄荷绿对勾。
- **导航栏**：`backdrop-blur(12px)` 悬浮效果，暗色半透明背景。

## 功能模块设计

### 模块 1: Next.js 脚手架

- `create-next-app` 生成 App Router + TypeScript + Tailwind + ESLint 项目骨架。
- 安装 `lucide-react` 作为图标库（对应用户指令的技术栈要求，替代任何其他图标方案）。
- 目录约定：`app/`（路由与页面）、`components/`（共享组件，如 `TopNav`、`Footer`）、`lib/mock/`（Mock 数据类型与 fixtures）、`lib/wallet/`（Mock 钱包 Hook/Context）。

**涉及层及关键设计:**

- 前端项目结构与构建配置；不涉及后端/数据库/合约。

### 模块 2: Tailwind 设计令牌

在 `tailwind.config.ts` 的 `theme.extend` 中落地上表颜色、字体族、圆角、间距、`container-max` 断点。字体通过 `next/font/google` 或本地字体文件引入 Sora / Inter / JetBrains Mono，并映射为 Tailwind `fontFamily` token（如 `font-display`、`font-body`、`font-mono-label`）。

**涉及层及关键设计:**

- `tailwind.config.ts`：`colors`、`fontFamily`、`borderRadius`、`spacing`、`screens`（补充或对齐 tablet/desktop 断点）。
- `app/globals.css`：暗色模式基底 `background`/`color`，字体变量注入。

### 模块 3: Mock 数据类型与钱包状态（身份/连接层已于 v2 替换为真实 Privy）

- `lib/mock/types.ts`：定义 `Course`、`Lesson`、`User`、`Certificate`、`Transaction`、`TeacherApplication` 等接口，字段参考 `docs/PRD.md` 第 7-8 节的链上/链下字段设计（仅借用字段命名，不做真实链上读写）。**v2 不变**。
- `lib/mock/fixtures.ts`：提供最小可用的示例数据集（后续 feature 可扩展/覆盖）。**v2 不变**。
- ~~`lib/wallet/useMockWallet.ts`（或 `WalletProvider` + Context）：`{ connected, address, ydBalance, network, connect, disconnect, setNetwork, setYdBalance }`，内部用 `useState` 模拟，无外部依赖。~~

**`[v2 修改]` `lib/wallet/useWallet.tsx`（文件与导出符号均从 `useMockWallet` 重命名为 `useWallet`，理由见下方技术决策）：**

- 依赖新增 `@privy-io/react-auth`（Privy React SDK，内部依赖 `viem`）。
- `PrivyProvider` 配置（在 `app/layout.tsx` 挂载，见模块 4）：
  ```ts
  {
    appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
    config: {
      loginMethods: ["email"],                 // 仅 Email 登录，不含短信/社交/外部钱包连接
      embeddedWallets: { createOnLogin: "users-without-wallets" }, // 自动创建 Ethereum 嵌入式钱包
      defaultChain: sepolia,                    // viem/chains 的 sepolia 定义
      supportedChains: [sepolia],
      appearance: { theme: "dark", accentColor: "#7c3aed" }, // 贴近项目 primary 色，Privy 模态框本身样式由 Privy 托管，不做逐像素还原
    },
  }
  ```
- `useWallet()` 包装 Privy 提供的 `usePrivy()`/`useWallets()`，对外暴露与旧 API 尽量对齐、但语义已调整的字段：
  - `connected: boolean` — 来自 `ready && authenticated`
  - `address: string | null` — `wallets[0]?.address ?? null`（**未登录为 `null`，旧版本恒为字符串，是破坏性变化**，全部消费方需要补充判空/加载态处理）
  - `network: "sepolia" | "wrong-network" | null` — 未登录为 `null`；已登录时按嵌入式钱包当前 `chainId` 是否等于 Sepolia 判定
  - `authError: string | null` — 捕获 `login()`/`switchToSepolia()` 抛出的错误信息（用户取消、Privy 初始化失败等），成功后清空
  - `login(): void` — 调用 Privy `login()` 打开登录模态框（异步、可能被取消，不像旧 `connect()` 是同步状态翻转）
  - `logout(): Promise<void>` — 调用 Privy `logout()`
  - `switchToSepolia(): Promise<void>` — 调用嵌入式钱包的 `switchChain(sepolia.id)`，失败时写入 `authError`
  - `ydBalance: number` / `setYdBalance(amount: number): void` — **原样保留**，用 `useState` 维护，与 Privy 状态完全独立（不因登录/登出重置，保持当前"演示态余额"的连续性，直到刷新页面）

**涉及层及关键设计:**

- 纯前端状态管理，`connected`/`address`/`network`/`authError` 来自 Privy SDK（真实、异步、可能失败），`ydBalance` 继续是本地 `useState` 模拟，两者共存于同一个 `WalletProvider`/`useWallet()` 返回值中，消费方无需区分数据来源。
- 无持久化要求（Privy 自身处理登录态的跨刷新保持；`ydBalance` 刷新后重置为初始 Mock 值，与 v1 行为一致，不在本次变更范围内调整）。

### 模块 4: 全局导航与页脚

- `components/layout/TopNav.tsx`：Logo、导航链接（首页/课程广场/老师工作台/Owner 后台）、钱包状态徽标（消费模块 3 的 Hook）、网络徽标。`[v2 修改]` 徽标逻辑：未登录展示"登录"按钮（`onClick={login}`）；`ready` 为 `false` 或登录流程进行中展示 loading 骨架；已登录展示 `address` 缩略 + 绿色状态点；`network === "wrong-network"` 时网络徽标变为警示配色（`tertiary`/`error` 二选一，实现时对照 Stitch 截图确认）且可点击触发 `switchToSepolia()`；`authError` 非空时在徽标旁展示一个小图标 + `title`/tooltip 显示错误文案（不打断其它 UI）。
- `components/layout/Footer.tsx`：链接列表 + 版权 + Sepolia Testnet 声明。**v2 不变**。
- `app/layout.tsx`：引入字体、`TopNav`、`Footer`、根级 `WalletProvider`。`[v2 修改]` `WalletProvider` 内部改为先挂载 `PrivyProvider`（见模块 3 配置），`ydBalance` 状态维护在 `PrivyProvider` 内层的一个轻量 Context 中（或直接在同一个自定义 `WalletProvider` 里用 `usePrivy()` + 本地 `useState` 组合实现，二者取决于实现时的封装偏好，接口对消费方透明）。

**涉及层及关键设计:**

- 组件 props 明确 TypeScript 化；导航链接使用 Next.js `Link`。
- `[v2 新增]` `PrivyProvider` 必须是 Client Component 边界内的顶层 Provider（`app/layout.tsx` 本身是 Server Component，需要一个 `"use client"` 的包装组件，复用/扩展现有的 `WalletProvider` 承担这个角色，避免额外新增文件）。

## 接口契约

`[v2 新增]` `lib/wallet/useWallet.tsx` 对外暴露的 Hook 接口（唯一的"真实"接口边界，其余仍是组件 props 与本地 Mock 状态）：

```ts
interface WalletState {
  connected: boolean
  address: string | null
  network: "sepolia" | "wrong-network" | null
  authError: string | null
  login: () => void
  logout: () => Promise<void>
  switchToSepolia: () => Promise<void>
  ydBalance: number
  setYdBalance: (amount: number) => void
}
```

无真实后端 API/RPC/合约接口——Privy SDK 内部与 Privy 云服务通信，本仓库不直接发起相关网络请求。

## 数据模型（Mock，仅前端内存/类型定义）

```ts
interface Course {
  id: string
  title: string
  teacher: string
  priceYD: number
  level: "beginner" | "intermediate" | "expert"
  coverUrl: string
  enrolledCount: number
  status: "draft" | "pending" | "approved" | "active"
}

interface Lesson {
  id: string
  courseId: string
  title: string
  order: number
  isPreview: boolean
}

interface User {
  address: string
  username: string
  role: "student" | "teacher" | "owner"
  ydBalance: number
}

interface Certificate {
  tokenId: string
  courseId: string
  courseName: string
  ownerAddress: string
  mintedAt: string
}

interface Transaction {
  courseId: string
  courseName: string
  priceYD: number
  purchasedAt: string
  txHash: string
}

interface TeacherApplication {
  address: string
  addedAt: string
  active: boolean
}
```

## 安全考虑

- 遵循 `.claude/rules/security.md`：~~不引入任何真实密钥、RPC 私钥或第三方登录 SDK~~ `[v2 修改]` 引入真实第三方登录 SDK（Privy），`NEXT_PUBLIC_PRIVY_APP_ID` 通过 `.env.local` 管理、提供 `.env.example`，不提交真实值；嵌入式钱包私钥由 Privy 托管，本仓库代码不存储/不接触任何私钥或助记词。`ydBalance` 等继续是硬编码/内存生成的假数据。
- 遵循 `.claude/rules/frontend.md`：设计还原必须基于 Stitch MCP 实际读取到的数据（本设计文档的令牌与结构均来自上述 MCP 调用），不得凭截图猜测。`[v2 说明]` 本次变更的功能范围（真实登录）在原设计稿之外，UI 视觉沿用现有 Stitch 令牌与组件样式，Privy 登录模态框本身样式由 Privy SDK 托管、仅做主题色对齐，不追求逐像素还原。
- `[v2 新增]` 本次变更明确不接入 YD Token 合约、课程购买合约、Supabase——`ydBalance`/购买/证书等业务逻辑继续 100% Mock，只有"身份是谁、钱包地址是什么、当前在哪条链"这三件事变为真实。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 图标库 | Lucide React | 用户指令明确指定 |
| 字体加载方式 | `next/font` | Next.js 官方推荐，自动子集化与自托管，避免额外网络请求 |
| Mock 钱包状态管理 | React Context + useState（不引入 Zustand/Redux 等） | 当前阶段状态简单，无需引入额外状态管理库，避免过度设计（v1 决策，v2 起身份/连接层改为真实但仍不引入额外状态库） |
| `[v2]` 钱包身份/连接层实现 | Privy React SDK（`@privy-io/react-auth`），仅 Email 登录 + 自动创建 Ethereum 嵌入式钱包 | 用户指令明确指定；嵌入式钱包免去用户预装浏览器插件钱包的门槛，符合"登录即用"的产品定位；本阶段不做外部钱包连接（MetaMask/WalletConnect/多钱包绑定），缩小变更面 |
| `[v2]` `useMockWallet` → `useWallet` 重命名 | 正式改名，删除 `Mock` 字样 | 身份/连接/网络已是真实数据，继续叫 "Mock" 会误导后续开发者；改名的代价（4 个消费方文件的 import 路径与函数名同步修改）在本次变更范围内一次性付清，好于长期留着误导性命名 |
| `[v2]` `ydBalance` 是否随 Privy 一起重构 | 保留独立 Mock 状态，不接入任何真实数据源 | 用户明确本次不接入 YD 合约；`ydBalance` 与"这是谁的钱包"无必然耦合，拆开处理让变更边界清晰，且完全不影响 feature 4 已实现的购买状态机后半段（授权/购买/余额判断）逻辑 |
