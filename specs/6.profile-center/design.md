# 个人中心 — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-12 | v1 | 初始设计 |

## 项目架构

- 架构类型: 单体仓库，Next.js App Router
- 涉及层: 仅前端（`app/profile/page.tsx` 及其子组件）

## Stitch 设计稿依据

通过 Stitch MCP 读取项目 `projects/8237832631308458514`，页面 `个人中心 - Web3 University`（`screens/aca5e9930bd9406eba921389f9867201`）得到的结构：

- **导航**："Web3 University Sepolia" 标识 + Home/Courses/Teacher/Admin + 钱包连接按钮。
- **资料区**：头像、用户名 "Web3Student"、角色"学生"、钱包地址 "0x123...abc"、余额 "16 YD"、"修改用户名"入口。
- **Tab**：已购课程 / 学习进度 / NFT 证书 / 购买记录。
- **NFT 证书区**：如"Solidity 入门证书"（Token ID #4829）、"DeFi 实战证书"（Token ID #1092）。
- **购买记录表**：课程名、价格（YD）、时间戳、交易哈希（含区块浏览器链接）。
- **修改用户名 Modal**：文本输入 + 取消/钱包签名确认按钮。
- **页脚**：复用 `Footer`。

> 实现阶段须再次通过 Stitch MCP 读取原始设计稿确认 Modal 与证书卡片的具体视觉细节（虹彩边框、脉冲动效实现方式），不得仅凭本文档摘要还原。

## 功能模块设计

### 模块 1: 个人信息头部

`components/profile/ProfileHeader.tsx`：读取 `useMockWallet()` 的 `address`/`ydBalance`，本地 `useState<string>` 管理用户名（初始值来自 `lib/mock/currentUser.ts`）。

### 模块 2: 修改用户名 Modal

`components/profile/EditUsernameModal.tsx`：受控输入框 + 两个按钮。点击"钱包签名确认"进入 Mock 签名等待态（`setTimeout` 800-1200ms），成功后调用父组件传入的 `onUsernameChange(newName)` 回调更新头部显示的用户名，并关闭 Modal。

### 模块 3: Tab 导航与内容区

`components/profile/ProfileTabs.tsx`：`useState<TabKey>` 管理当前激活 Tab，四个子组件按需渲染：

- `PurchasedCoursesTab.tsx`
- `LearningProgressTab.tsx`
- `CertificatesTab.tsx`（证书卡片使用设计系统的虹彩边框：`border-2` + 渐变边框技巧，如 `bg-gradient-to-r` 包裹一层内层背景实现渐变边框效果；脉冲动效用 Tailwind `animate-pulse` 或自定义 `@keyframes`）
- `PurchaseRecordsTab.tsx`（表格样式遵循 admin 表格规范：无竖线、细横向分隔线、JetBrains Mono 展示交易哈希）

### 模块 4: 与 Mock 购买记录集成

`lib/mock/purchaseStore.ts`（与 feature 4 共用同一模块/接口约定）提供 `getPurchases(): MockPurchaseRecord[]`。`PurchasedCoursesTab` 与 `PurchaseRecordsTab` 的 `useState` **初始值必须是本 feature 内置的默认 fixtures**（与服务端渲染结果一致），**不得**在渲染期间直接调用 `getPurchases()` 读取 `localStorage`——`typeof window !== "undefined"` 只能避免服务端报错，无法让服务端与客户端首次渲染的结果一致，仍会产生 hydration mismatch。正确做法与 feature 4/5 一致：在 `useEffect(() => { ... }, [])` 中（挂载后、hydration 完成后）调用 `getPurchases()`，若返回非空数组则 `setState` 替换为其内容；若为空数组则保留默认 fixtures 不变。

**涉及层及关键设计:**

- 全部客户端组件；购买记录的读取严格发生在 `useEffect` 内，`useState` 初始值恒定为默认 fixtures，服务端与客户端首次渲染输出一致。

## 接口契约

无。

## 数据模型

复用 feature 1 的 `User`/`Certificate`/`Transaction` 类型，以及 feature 4 定义的 `MockPurchaseRecord`（用于弱依赖集成）。本 feature 在 `lib/mock/profileFixtures.ts` 中提供默认的证书、进度、交易记录 fixtures。

## 安全考虑

- "钱包签名确认"仅为 Mock UI 等待态，不调用任何真实签名 API；文案中避免出现可能让用户误以为是真实链上操作的措辞歧义（可在按钮旁加小字"演示模式"提示，视实现时是否与设计稿冲突而定，若冲突则不强制加）。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 购买记录数据来源 | 优先读 `localStorage`（feature 4 写入），回退本地 fixtures | 保证 feature 4/6 各自独立开发时都可验收，同时又支持串起来演示的场景 |
| 证书虹彩边框实现 | 纯 CSS（渐变边框 + `animate-pulse`），不引入额外动画库 | 单一样式效果，CSS 足以实现，无需引入 Framer Motion 等库 |
