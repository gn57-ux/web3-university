# 个人中心 — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-12 | v1 | 初始任务 |
| 2026-08-13 | v2 | 需求/设计已记录接入真实 `useWallet()` + 新增登录门禁的变更说明；对应实现任务集中在 [[10.wallet-auth-integration]]，本文件任务列表不新增任务 |

## 项目信息

- 项目名: web3-university
- 架构类型: 单体仓库（Next.js 前端）
- specs 路径: specs/6.profile-center/

## 任务列表

### 功能 1: 资料头部

- [x] T-001: 个人信息头部（头像/用户名/角色徽标/钱包地址/YD 余额） ~30min
- [x] T-002: 修改用户名 Modal（输入框 + 取消/钱包签名确认 + Mock 签名等待态） ~30min

### 功能 2: Tab 导航

- [x] T-003: Tab 导航组件（已购课程/学习进度/NFT证书/购买记录） ~15min
- [x] T-004: 已购课程 Tab 内容（课程卡列表 + 继续学习入口；`useState` 初始为默认 fixtures，`useEffect` 挂载后再从 `purchaseStore.getPurchases()` 恢复，避免 hydration mismatch） ~30min
- [x] T-005: 学习进度 Tab 内容（进度条列表） ~15min
- [x] T-006: NFT 证书 Tab 内容（虹彩边框证书卡片 + Token ID） ~30min
- [x] T-007: 购买记录 Tab 内容（交易表格：课程/价格/时间/交易哈希+浏览器链接占位；同 T-004，`useEffect` 内恢复 `purchaseStore` 数据，避免 hydration mismatch） ~30min

### 集成与测试

- [x] T-008: 响应式联调（Tab 移动端横向滚动，表格移动端转卡片式布局，对照 Stitch 截图） ~30min

## 依赖关系

- T-004、T-007 依赖 T-003（需先有 Tab 容器）以及 [[4.course-detail-mock-purchase]] 的 `purchaseStore`（弱依赖，全限定：`6.T-004 弱依赖 4.T-004`、`6.T-007 弱依赖 4.T-004`，缺失时回退本地 fixtures）
- T-008 依赖 T-001 至 T-007
- 本 feature 依赖 [[1.project-foundation-design-system]]，全限定依赖：`6.T-001 依赖 1.T-005, 1.T-008`

## 风险点

- 若开发顺序上 feature 6 早于 feature 4 完成，`purchaseStore` 模块尚不存在，需按 design.md 约定的接口签名（`getPurchases(): MockPurchaseRecord[]`）先行实现一个空实现或本地占位版本，待 feature 4 完成后再对齐，避免相互阻塞。
- `[v2]` 本 feature 的 `requirements.md`/`design.md` 记录了接入真实 `useWallet()` + 新增登录门禁的变更说明（`F-001`/`F-008`/`AC-001`/`AC-005` 标注 `[v2 修改/新增]`），但实现任务已集中到 [[10.wallet-auth-integration]] 的 T-007，避免本 feature 任务数超出约束。门禁必须在**渲染层面**排除未登录内容（不渲染，而不是渲染后隐藏）这一约束，实现时以 Feature 10 的 design.md/tasks.md 为准。
