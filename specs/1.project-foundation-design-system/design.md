# 项目脚手架与设计系统 — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-12 | v1 | 初始设计 |

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

### 模块 3: Mock 数据类型与 Mock 钱包状态

- `lib/mock/types.ts`：定义 `Course`、`Lesson`、`User`、`Certificate`、`Transaction`、`TeacherApplication` 等接口，字段参考 `docs/PRD.md` 第 7-8 节的链上/链下字段设计（仅借用字段命名，不做真实链上读写）。
- `lib/mock/fixtures.ts`：提供最小可用的示例数据集（后续 feature 可扩展/覆盖）。
- `lib/wallet/useMockWallet.ts`（或 `WalletProvider` + Context）：`{ connected, address, ydBalance, network, connect, disconnect, setNetwork, setYdBalance }`，内部用 `useState` 模拟，无外部依赖。`setNetwork(network: "sepolia" | "mainnet" | "unsupported")` 与 `setYdBalance(amount: number)` 是供页面（尤其是 feature 4 的购买面板）手动触发"错误网络""余额不足"等 Mock 场景的必要接口，否则这些状态在 `connect`/`disconnect` 二元 API 下无法被构造，导致 F-004 中要求的「需切换网络」「YD 余额不足」分支无法实现或验证。开发/演示环境可在页面上提供隐藏的调试面板或按钮调用这两个方法，供 4.T-008 的全流程手动联调使用。

**涉及层及关键设计:**

- 纯前端状态管理（React Context + `useState`/`useReducer`），无持久化要求（如需跨页面保留购买记录等状态，由具体 feature 决定是否使用 `localStorage`，本 feature 只提供基础设施）。

### 模块 4: 全局导航与页脚

- `components/layout/TopNav.tsx`：Logo、导航链接（首页/课程广场/老师工作台/Owner 后台）、钱包状态徽标（消费模块 3 的 Hook）、网络徽标。
- `components/layout/Footer.tsx`：链接列表 + 版权 + Sepolia Testnet 声明。
- `app/layout.tsx`：引入字体、`TopNav`、`Footer`、根级 `WalletProvider`。

**涉及层及关键设计:**

- 组件 props 明确 TypeScript 化；导航链接使用 Next.js `Link`。

## 接口契约

无（当前阶段无真实 API/RPC/合约接口，全部为组件 props 与本地 Mock 状态）。

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

- 遵循 `.claude/rules/security.md`：不引入任何真实密钥、RPC 私钥或第三方登录 SDK；Mock 钱包地址、余额等均为硬编码/内存生成的假数据。
- 遵循 `.claude/rules/frontend.md`：设计还原必须基于 Stitch MCP 实际读取到的数据（本设计文档的令牌与结构均来自上述 MCP 调用），不得凭截图猜测。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 图标库 | Lucide React | 用户指令明确指定 |
| 字体加载方式 | `next/font` | Next.js 官方推荐，自动子集化与自托管，避免额外网络请求 |
| Mock 钱包状态管理 | React Context + useState（不引入 Zustand/Redux 等） | 当前阶段状态简单，无需引入额外状态管理库，避免过度设计 |
