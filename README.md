# Web3 University

Web3 在线课程 DApp：链上 YD Token 支付 + NFT 课程证书，链下承载视频/评论/进度。仓库包含两部分：

- **前端**（仓库根目录）：Next.js + TypeScript + Tailwind CSS 实现的 Stitch 设计稿静态 UI 与 Mock 交互，**当前阶段不接入真实钱包/数据库/智能合约**。
- **智能合约教学示例**（`contracts/`）：与前端无关的独立 Remix 演示合约，见文末「智能合约教学示例」章节。

## 前端

### 技术栈

- **框架**：Next.js 16（App Router）+ React 19 + TypeScript
- **样式**：Tailwind CSS v4（CSS-first `@theme` 配置，无 `tailwind.config.ts`），暗色模式 "Ethereal Academy" 设计系统（Sora 标题 / Inter 正文 / JetBrains Mono 代码与数据）
- **图标**：lucide-react
- **数据层**：全部为前端 Mock（`lib/mock/`），无后端、无数据库；购买记录/证书等状态通过 `localStorage` 模拟持久化

### 快速开始

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 生产构建
npm run lint      # eslint .
```

无需配置环境变量（当前阶段无真实钱包/数据库/合约接入）。

### 目录结构

```
app/                       # App Router 页面
├── page.tsx                首页
├── courses/                课程广场 + 课程详情（[courseId]）
├── learn/[courseId]/       学习中心（购课门禁）
├── profile/                个人中心
├── teacher/                老师工作台
└── admin/                  Owner 后台

components/
├── layout/                 TopNav / Footer（全站共用）
├── home/                    首页区块
├── marketplace/             课程广场筛选/网格
├── course-detail/           课程详情 + 模拟购买状态机
├── learning-center/          视频/章节/评论/购课门禁
├── profile/                 个人中心 Tab 内容
├── teacher/                  老师工作台课程管理
└── admin/                   Owner 后台审核/白名单/完课确认

lib/
├── mock/                    Mock 数据与各 feature 的 fixtures（courseDetails/purchaseStore/teacherFixtures/adminFixtures 等）
├── wallet/                   Mock 钱包 Context（useMockWallet）
└── purchase/                 购买/进度相关的共享 Hook（usePurchaseFlow、useProfilePurchases）
```

### 功能模块

| 路由 | 说明 |
| --- | --- |
| `/` | 首页：Hero、平台指标、学习路径、精选课程 |
| `/courses` | 课程广场：搜索、难度筛选、课程卡网格 |
| `/courses/[courseId]` | 课程详情 + 两阶段模拟购买（授权 → 购买） |
| `/learn/[courseId]` | 学习中心：Mock 视频、章节顺序解锁进度、评论、完课证书铸造提示；未购买该课程时展示购课门禁 |
| `/profile` | 个人中心：资料/签名改名、已购课程、学习进度、NFT 证书、购买记录 |
| `/teacher` | 老师工作台：提交/编辑课程、状态管理（草稿/待审核/已上架） |
| `/admin` | Owner 后台：课程审核、老师白名单、完课确认与铸造入口（演示模式，无真实权限校验） |

### 当前阶段范围（重要）

- 仅实现 Stitch 设计稿对应的静态 UI 与 Mock 交互；不接入 Privy/wagmi/viem 的真实钱包调用、不接入 Supabase、不发起真实合约调用。
- "连接钱包""购买课程""铸造 NFT"等操作均为本地状态机 + `setTimeout` 模拟的 Mock 异步流程。
- 各页面间共享的课程/证书/购买记录等数据集中在 `lib/mock/`，详细的架构决策与踩坑记录见 `specs/LESSONS.md` 与 `specs/memory/`。

### 部署

纯静态/SSR 前端，`npm run build` 后可部署到任意支持 Next.js 的平台（Vercel 等），无需额外环境变量或后端服务。

## 智能合约教学示例

`contracts/` 下两个可直接复制到 Remix 的合约，与上述前端无业务关联：

- `contracts/PrivateBank.sol`：每个地址充值、查询并提取自己的 ETH。
- `contracts/EthRedPacket.sol`：创建等额或教学用伪随机 ETH 红包，每个地址限领一次。

### 1. 私人银行演示

1. 打开 <https://remix.ethereum.org/>，新建 `PrivateBank.sol` 并粘贴合约。
2. 在 **Solidity Compiler** 中选择 `0.8.24` 或兼容的 `0.8.x`，点击 Compile。
3. 在 **Deploy & Run Transactions** 中选择 `Remix VM`，点击 Deploy。
4. 在 VALUE 输入 `1`，单位选 `ether`，点击橙色的 `deposit`。
5. 点击 `myBalance`，应返回 `1000000000000000000` wei。
6. 调用 `withdraw`，参数填 `500000000000000000`，再查余额应剩 `0.5 ETH`。
7. 切换另一个 Account，`myBalance` 应为 0，且不能提取第一个账户的钱。

### 2. ETH 抢红包演示

部署构造参数示例：

- `count`：`3`
- `equalMode`：`true`（等额）或 `false`（伪随机）
- `durationSeconds`：`300`（5 分钟）
- Remix 的 VALUE：`3 ether`

部署后：

1. 切换到另一个 Remix Account，调用 `grabRedPacket`。
2. 调用 `hasClaimed` 并输入刚才的地址，应返回 `true`。
3. 同一账户再次调用 `grabRedPacket`，交易应回滚并提示已经领取。
4. 切换不同账户继续抢，观察 `remainingAmount` 和 `remainingCount`。
5. 过期后，只有创建者能调用 `refund` 取回未领取的 ETH。

### 答辩时可讲的要点

- `payable` 让函数或构造器能够接收 ETH；`msg.value` 是本次发送的金额。
- `mapping` 保存账户余额或领取状态。
- 提现采用 Checks-Effects-Interactions：先检查、再更新状态、最后转账。
- `nonReentrant` 防止收款合约在转账回调中重复进入提现或领取函数。
- 链上数据不是秘密；`block.prevrandao` 等区块数据也不是安全随机源。本作业随机红包只适合课堂演示，真实资金应使用可验证随机数方案。

> 建议先在 Remix VM 演示，不花测试币。这两个合约与前端无关联，独立教学用途。
