# onchain-completion-certificate — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-20 | v1 | 初始任务 |

## 项目信息

- 项目名: web3-university
- 架构类型: 单体仓库
- specs 路径: specs/16.onchain-completion-certificate/

## 任务列表

### 功能 1：完课确认 API

- [ ] T-001: `app/api/complete-course/route.ts`（服务端 Route Handler，持有 `TRUSTED_SUBMITTER_PRIVATE_KEY`，调用 `DemoCompletionOracle.confirmCompletion`，输入校验 courseId 白名单+地址格式）；`.env.example` 新增占位符 ~30min
- [ ] T-002: 部署种子脚本（[[14.contract-client-foundation]]）追加：把该受信任提交者账户注册进 `DemoCompletionOracle.setTrustedSubmitter` ~10min

### 功能 2：前端触发与状态

- [ ] T-003: `lib/purchase/useCompletionConfirmation.ts` + `LearningCenter.tsx` "确认完成并铸造证书"按钮，`TxStatus` 展示、`CourseAlreadyCompleted` 等错误的中文提示 ~30min

### 功能 3：证书展示

- [ ] T-004: `lib/purchase/useOnchainCertificates.ts`（`hasCertificate`→事件查 tokenId→`certificateData`/`tokenURI`/`ownerOf`） ~30min
- [ ] T-005: 个人中心"NFT 证书"Tab 接入真实数据，替换 Mock 展示 ~20min

### 集成与测试

- [ ] T-006: 浏览器端到端联调：学习中心完成全部章节 → 点击确认完成 → 个人中心 NFT 证书 Tab 出现真实 tokenId/owner；重复点击确认已被禁用/给出明确提示；`npm run lint`/`npx tsc --noEmit`/`npm run build` 全绿；`forge fmt`/`build`/`test`/`coverage` 对种子脚本改动重新跑一遍确认无回归 ~30min

## 依赖关系

- 全部任务依赖 [[14.contract-client-foundation]]、[[15.onchain-token-course-purchase]] 已完成
- T-002 依赖 T-001（需要先确定受信任提交者账户地址）
- T-003 依赖 T-001、T-002
- T-005 依赖 T-004
- T-006 依赖 T-001~T-005 全部完成

## 风险点

- `TRUSTED_SUBMITTER_PRIVATE_KEY` 虽然是公开已知的 Anvil 测试账户私钥，仍必须放在服务端环境变量而非任何会被打包进浏览器 bundle 的位置（`NEXT_PUBLIC_` 前缀、客户端组件常量等都不行），实现和自查阶段都要确认这一点。
- `getContractEvents` 反查 tokenId 依赖本地 Anvil 链的区块数量极少这个前提，实现时不要引入无上限的分页/重试逻辑掩盖"这只在小规模本地链上可行"的真实边界。
- 完课确认按钮的可见性必须严格依赖链上 `hasPurchased`/`completed` 状态，不能只看前端本地的"章节是否看完"状态就允许触发（购课门禁+完成状态都要在链上校验链路上，不能被前端状态绕过）。
