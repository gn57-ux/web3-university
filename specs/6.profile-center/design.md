# 个人中心 — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-12 | v1 | 初始设计 |
| 2026-08-13 | v2 | 头部地址接入真实 `useWallet()`，新增登录门禁（随 1.wallet-auth 变更联动） |

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

### 模块 0: 登录门禁 `[NEW v2]`

`app/profile/page.tsx` 顶层逻辑：读取 `useWallet().connected`。未登录 → 渲染 `components/profile/LoginRequiredGate.tsx`（结构参考 `components/learning-center/PurchaseRequiredGate.tsx`：图标 + "请先登录"文案 + 登录按钮，`onClick={login}`），不渲染 `ProfileHeader`/`ProfileTabs`/`EditUsernameModal` 中的任何一个。已登录 → 正常渲染模块 1-3 的完整内容。

`useWallet()` 的 `connected` 是同步可读的 Privy 状态（非 `localStorage` 派生），不存在 feature 4/5 那类"`useSyncExternalStore` 避免 hydration mismatch"的问题——Privy SDK 自身处理首次加载时的 `ready` 状态，`connected` 在 `ready` 为 `false` 期间应视为"未登录"处理（门禁态），不需要额外的骨架屏。

### 模块 1: 个人信息头部

`components/profile/ProfileHeader.tsx`：~~读取 `useMockWallet()` 的 `address`/`ydBalance`~~ `[v2 修改]` 读取 `useWallet()` 的 `address`（`import` 路径改为 `@/lib/wallet/useWallet`；模块 0 门禁已保证渲染到这里时 `connected` 必为 `true`，但 `address` 类型仍是 `string | null`，实现时按"门禁已排除未登录情况"简单处理为非空断言或 fallback 空字符串均可，二者选一，不需要再画一层门禁）与 `ydBalance`（Mock，不变），本地 `useState<string>` 管理用户名（初始值来自 `lib/mock/currentUser.ts`，不变）。

### 模块 2: 修改用户名 Modal

`components/profile/EditUsernameModal.tsx`：受控输入框 + 两个按钮。点击"钱包签名确认"进入 Mock 签名等待态（`setTimeout` 800-1200ms），成功后调用父组件传入的 `onUsernameChange(newName)` 回调更新头部显示的用户名，并关闭 Modal。

### 模块 3: Tab 导航与内容区

`components/profile/ProfileTabs.tsx`：`useState<TabKey>` 管理当前激活 Tab，四个子组件按需渲染：

- `PurchasedCoursesTab.tsx`
- `LearningProgressTab.tsx`
- `CertificatesTab.tsx`（证书卡片使用设计系统的虹彩边框：`border-2` + 渐变边框技巧，如 `bg-gradient-to-r` 包裹一层内层背景实现渐变边框效果；脉冲动效用 Tailwind `animate-pulse` 或自定义 `@keyframes`）
- `PurchaseRecordsTab.tsx`（表格样式遵循 admin 表格规范：无竖线、细横向分隔线、JetBrains Mono 展示交易哈希）

### 模块 4: 与 Mock 购买记录集成

`lib/mock/purchaseStore.ts`（与 feature 4 共用同一模块/接口约定）提供 `getPurchases(): MockPurchaseRecord[]`。

> **实现阶段更新**：本段原方案（`useState` 初值为默认 fixtures + `useEffect` 挂载后 `getPurchases()` 非空则 `setState` 替换）与 feature 4/5 已被 `specs/LESSONS.md` 判定为反模式的旧方案同构（`useEffect` 里同步 `setState` 恢复外部状态）。实际实现用共享 hook `lib/purchase/useProfilePurchases.ts` 封装 `useSyncExternalStore(subscribePurchases, getSnapshot, getServerSnapshot)`：`getServerSnapshot` 恒返回 `mockTransactions`（与 SSR 一致），客户端 `getSnapshot` 优先返回 `getPurchases()` 的真实结果，为空则回退 `mockTransactions`。`PurchasedCoursesTab`/`PurchaseRecordsTab` 都消费这个共享 hook。
>
> 踩坑记录：`getPurchases()` 内部 `JSON.parse(localStorage 内容)` 每次调用都产出新数组引用，直接作为 `useSyncExternalStore` 的 `getSnapshot` 返回值会违反其"无变化必须返回同一引用"的契约，导致无限重渲染。修复方式是在 `purchaseStore.ts` 的 `readStorage()` 内按原始字符串做一层引用缓存，字符串不变则复用旧数组引用。
>
> **回退数据与真实购课门禁的边界**：`useProfilePurchases()` 回退时返回的是 `lib/mock/fixtures.ts` 里那个具体的 `mockTransactions` 数组引用，可以用 `purchases === mockTransactions` 做引用相等判断，区分"当前展示的是真实购买记录"还是"回退演示数据"。这个区分是必要的，因为回退数据里的课程并未被 `lib/mock/purchaseStore.ts` 记录为真实已购：
> - `PurchasedCoursesTab.tsx`：回退态下"继续学习"入口退化为"查看课程详情"（`/courses/{id}`），不跳转会被购课门禁拦截的 `/learn/{id}`（见 requirements.md F-004 的例外说明）。
> - `LearningProgressTab.tsx`：真实购买记录存在时，必须按购买的 `courseId` 过滤/合成 `lib/mock/profileFixtures.ts` 的 `defaultCourseProgress`（缺预设记录的课程按"前 3 课已完成"合成，与学习中心默认演示进度一致），不能不加区分地展示全部 3 条固定记录，否则与"已购课程"/"购买记录" Tab 已切到真实数据的状态矛盾。回退（无真实购买记录）态才展示 `defaultCourseProgress` 全部内容。

**涉及层及关键设计:**

- 全部客户端组件；购买记录读取经由 `useProfilePurchases()` 的 `useSyncExternalStore`（见上方模块 4 更新说明），服务端与客户端首次渲染输出一致，不产生 hydration mismatch。

## 接口契约

无。

## 数据模型

复用 feature 1 的 `User`/`Certificate`/`Transaction` 类型，以及 feature 4 定义的 `MockPurchaseRecord`（用于弱依赖集成）。本 feature 在 `lib/mock/profileFixtures.ts` 中提供默认的证书、进度、交易记录 fixtures。

## 安全考虑

- "钱包签名确认"仅为 Mock UI 等待态，不调用任何真实签名 API；文案中避免出现可能让用户误以为是真实链上操作的措辞歧义（可在按钮旁加小字"演示模式"提示，视实现时是否与设计稿冲突而定，若冲突则不强制加）。**`[v2 说明]`** 这一条不受本次变更影响——用户名签名确认继续是 Mock，本次只把"你是谁"（地址）换成真实的，不涉及真实消息签名。
- `[v2 新增]` 未登录用户不应能看到任何登录用户的资料/Tab 内容（门禁必须在渲染层面直接不渲染，而不是渲染后用 CSS 隐藏），避免真实场景下的信息泄露；当前阶段无多用户区分（单一 Privy App 下每个真实登录会话对应各自的真实地址，`ProfileHeader` 展示的就是当前登录者自己的地址，不存在越权查看他人资料的路径）。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 购买记录数据来源 | 优先读 `localStorage`（feature 4 写入），回退本地 fixtures | 保证 feature 4/6 各自独立开发时都可验收，同时又支持串起来演示的场景 |
| 证书虹彩边框实现 | 纯 CSS（渐变边框 + `animate-pulse`），不引入额外动画库 | 单一样式效果，CSS 足以实现，无需引入 Framer Motion 等库 |
| `[v2]` 登录门禁的组件结构 | 新建 `LoginRequiredGate.tsx`，视觉复用 `PurchaseRequiredGate.tsx` 的模式（不做成共享组件抽象） | 两者文案/触发动作不同（登录 vs 购买），且当前只有两处用到，抽公共组件属于当前阶段用不到的预先抽象；后续若第三处需要类似门禁再考虑抽取 |
| `[v2]` 门禁判定时机 | 直接读 `useWallet().connected`（同步），不额外加 loading/骨架态 | Privy 的 `ready` 状态已经内建在 `connected` 判定里（`connected = ready && authenticated`），未就绪期间自然落入"未登录"门禁态，不需要为 Privy 自身的初始化过程再设计一层临时态 |
