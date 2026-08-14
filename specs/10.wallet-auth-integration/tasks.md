# Privy 钱包身份接入 — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-13 | v1 | 初始任务（集中管理 1/2/4/6 四个 feature 的钱包身份实现任务） |

## 项目信息

- 项目名: web3-university
- 架构类型: 单体仓库（Next.js 前端）
- specs 路径: specs/10.wallet-auth-integration/

## 任务列表

### 功能 1: Privy 基础设施

- [ ] T-001: 安装 `@privy-io/react-auth`；新增 `NEXT_PUBLIC_PRIVY_APP_ID` 环境变量（仅通过环境变量读取，缺失时明确报错，不得用假值兜底）；真实 App ID 只写入本地 `.env.local`；新增 `.env.example` 模板，只写占位符（如 `NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id`），禁止写入真实值；确认 `.env.local` 已被 `.gitignore` 覆盖 ~30min

### 功能 2: 统一钱包适配层

- [ ] T-002: 将 `lib/wallet/useMockWallet.tsx` 重写并重命名为 `lib/wallet/useWallet.tsx`：`connected`/`address`(nullable)/`network`/`authError` 消费 Privy `usePrivy()`/`useWallets()` 的真实状态，`login()`/`logout()`/`switchToSepolia()` 调用对应 Privy API（仅 Email 登录 + 自动创建的 Ethereum 嵌入式钱包，不支持 MetaMask/WalletConnect 等外部钱包连接）；`ydBalance`/`setYdBalance` 原样保留为独立本地 `useState` ~30min
- [ ] T-003: `app/layout.tsx` 内的 `WalletProvider` 改为先挂载 `PrivyProvider`（`appId`/`loginMethods: ["email"]`/`embeddedWallets.createOnLogin`/`defaultChain: sepolia`），`ydBalance` 状态维护在其内层 ~15min

### 功能 3: 全站消费点接入

- [ ] T-004: `TopNav.tsx` 钱包徽标改接真实 `useWallet()`：未登录"登录"按钮、登录中 loading 态、已登录地址+绿点、`wrong-network` 时网络徽标可点击触发 `switchToSepolia()`、`authError` 非空时展示错误提示 ~30min
- [ ] T-005: `Hero.tsx`（首页）"连接钱包"按钮改用 `useWallet().login()`，补充登录中 loading 态与 `address` 判空处理 ~15min
- [ ] T-006: `PurchasePanel.tsx`/`usePurchaseFlow.ts`（课程详情）的 `wallet-disconnected`/`wrong-network` 前置状态接入真实 `useWallet()`：import 路径更新、"连接钱包"按钮改 `login`、"切换到 Sepolia"按钮改 `switchToSepolia()`；确认 `insufficient-balance` 起的后续 Mock 阶段不受影响 ~15min
- [ ] T-007: 新建 `components/profile/LoginRequiredGate.tsx`（参考 `PurchaseRequiredGate.tsx` 视觉模式）；`app/profile/page.tsx` 按 `useWallet().connected` 分流渲染门禁或完整内容；`ProfileHeader.tsx` 接入真实 `address` ~30min

### 集成与测试

- [ ] T-008: 集成测试与响应式回归：完整登录→各页面状态核查→切网→购买流程不回归→退出登录全流程手动联调；三档断点（375/768/1280）走查首页/课程详情/个人中心；故意缺失 `NEXT_PUBLIC_PRIVY_APP_ID` 验证报错行为 ~30min

## 依赖关系

- T-002 依赖 T-001（需先有 Privy App ID 与依赖包才能实现 Hook）
- T-003 依赖 T-002
- T-004、T-005、T-006、T-007 依赖 T-003（`PrivyProvider` 挂载后各消费点才能正常调用 `useWallet()`）
- T-008 依赖 T-004、T-005、T-006、T-007（全部消费点接入完成后才能做整体回归）
- 本 feature 依赖 [[1.project-foundation-design-system]]、[[2.homepage]]、[[4.course-detail-mock-purchase]]、[[6.profile-center]] 已完成的 v1 实现（本 feature 是在其基础上做的钱包身份替换，不是从零实现）

## 风险点

- T-002 是破坏性 API 变更的核心：`useMockWallet` → `useWallet`，`connect/disconnect/setNetwork` → `login/logout/switchToSepolia`，`address` 从恒为字符串变为可能为 `null`。T-004~T-007 完成前，项目会因为找不到 `useMockWallet` 模块编译失败——这 4 个消费点 task 必须在同一轮 `/yd:ai` 运行中随 T-002/T-003 一起推进到底，不能只做完 T-001~T-003 就停下。
- `NEXT_PUBLIC_PRIVY_APP_ID` 缺失是已知的外部环境阻塞：执行 T-001 前需确认用户已在 Privy Dashboard 创建应用并提供该值，否则应暂停等待，不得用假值继续。
- `address` 类型收窄（`string` → `string | null`）是本次影响面最大的类型变化，T-004~T-007 各自完成后务必用 `tsc --noEmit` 确认没有遗漏的判空分支，不能只凭肉眼检查。
- T-006 改动面很小（design.md 已确认状态推导逻辑不需要改），但仍需完整跑一遍课程购买流程（AC-007）确认 `insufficient-balance` 起的 Mock 阶段无回归。
