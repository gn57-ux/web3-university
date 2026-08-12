# 课程详情与模拟购买 — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-12 | v1 | 初始任务 |

## 项目信息

- 项目名: web3-university
- 架构类型: 单体仓库（Next.js 前端）
- specs 路径: specs/4.course-detail-mock-purchase/

## 任务列表

### 功能 1: 课程详情内容

- [ ] T-001: 课程详情头部（标题/讲师/难度徽标/简介） ~30min
- [ ] T-002: 课程大纲可展开模块列表（5 个模块） ~30min
- [ ] T-003: 学员评价区块（Mock 评价卡片 + 星级） ~15min

### 功能 2: 购买状态机

- [ ] T-004: 共享 Mock Store 模块 `lib/mock/purchaseStore.ts`（`getPurchases()`/`recordPurchase(courseId, courseName, priceYD)`，记录含 `courseName` 避免消费方需要额外查找表，读写 `localStorage`） ~15min
- [ ] T-005: 购买面板状态机 Hook 与 8 种状态的视觉呈现（「已购买」`useState` 初始值必须为 `false`（与 SSR 一致，避免 hydration mismatch），在 `useEffect` 内挂载后再从 `purchaseStore.getPurchases()` 按 courseId 恢复；已购买态短路优先于前置条件；`isApproving`/`isBuying` 瞬时态需先于 `needs-approval`/`ready-to-buy` 稳定态判断，否则点击按钮后的 loading 反馈不可达） ~30min
- [ ] T-006: 两阶段交易按钮组件（Approve→Purchase 形态过渡 + Mock 异步等待） ~30min

### 功能 3: 购买后集成

- [ ] T-007: 购买成功调用 `recordPurchase()` 写入共享 Mock Store +「开始学习」跳转学习中心路由 ~15min

### 集成与测试

- [ ] T-008: 响应式与全流程手动联调（购买面板移动端布局 + 8 种状态逐一手动触发验证，其中"错误网络"/"YD 余额不足"需通过 [[1.project-foundation-design-system]] 提供的 `useMockWallet().setNetwork()`/`setYdBalance()` 构造 + 刷新页面/断开钱包后已购买态保持不回退） ~30min

## 依赖关系

- T-004 不依赖本 feature 内其他任务，可最先实现
- T-005 依赖 T-001（面板需嵌入详情页布局）、T-004（需读取 `getPurchases()` 初始化已购买态）
- T-006 依赖 T-005（按钮是状态机的视觉呈现载体）
- T-007 依赖 T-004、T-006（购买流程走完才能调用 `recordPurchase()` 写入记录）
- T-008 依赖 T-001、T-002、T-003、T-005、T-006、T-007
- 本 feature 依赖 [[1.project-foundation-design-system]]，全限定依赖：`4.T-005 依赖 1.T-005`（Mock 钱包 Hook）

## 风险点

- 状态机的状态切换顺序若与真实业务逻辑（先查连接→查网络→查余额→查授权）不一致，会导致用户在某些 Mock 组合下看到矛盾的按钮态，实现时需按 design.md 中定义的优先级顺序严格实现并逐状态手动测试。
- `localStorage` 写入的 Mock 购买记录格式需与 feature 6（个人中心）「购买记录」Tab 的读取字段保持一致，若字段命名不一致会导致集成时静默失败（无报错但数据不显示），建议实现时在两个 feature 间统一确认 `MockPurchaseRecord` 字段命名。
