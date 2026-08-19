# course-certificate-completion — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-19 | v1 | 初始任务 |

## 项目信息

- 项目名: web3-university
- 架构类型: 单体仓库（Foundry 子工程）
- specs 路径: specs/13.course-certificate-completion/

## 任务列表

### 功能 1：CourseCertificate

- [ ] T-001: 实现 `src/CourseCertificate.sol`（OZ `ERC721`，`setMinter` onlyOwner，`mint` onlyMinter 含 `hasCertificate` 防重复，`tokenURI` 返回铸造时传入的 URI，自定义 error，`CertificateMinted`/`MinterUpdated` 事件） ~30min
- [ ] T-002: `test/CourseCertificate.t.sol`：非 minter 铸造 revert、minter 铸造成功（owner/tokenURI/事件正确）、同一 `(courseId, student)` 重复铸造 revert、不同学生对同一课程各自可获得证书 ~30min

### 功能 2：DemoCompletionOracle

- [ ] T-003: 实现 `src/DemoCompletionOracle.sol`（受信任提交者白名单、`confirmCompletion` 转发调用、自定义 error、`TrustedSubmitterUpdated` 事件） ~15min
- [ ] T-004: `test/DemoCompletionOracle.t.sol`：非受信任地址调用 revert、Owner 增删提交者、受信任提交者调用成功转发（用 mock/实际 `Web3University` 均可） ~15min

### 功能 3：Web3University 扩展（完课确认接线）

- [ ] T-005: 扩展 `src/Web3University.sol`：`completed` mapping、`oracle`/`certificate` 地址、`setOracle`/`setCertificate` onlyOwner、`markCompleted` onlyOracle + nonReentrant（校验已购买、未重复完成，调用 `CourseCertificate.mint`），新增自定义 error 与 `CourseCompleted`/`OracleUpdated`/`CertificateContractUpdated` 事件；确认不改动 [[12.course-marketplace-contract]] 已交付的函数签名与行为 ~30min
- [ ] T-006: `test/Web3University.t.sol`（第三部分，完课确认）：完整链路集成测试（受信任提交者 → `DemoCompletionOracle.confirmCompletion` → `Web3University.markCompleted` → `CourseCertificate.mint` 全链路断言 tokenId/事件/owner）、未购买课程标记完成 revert、重复标记完成 revert、非 oracle 地址直接调用 `markCompleted` revert ~30min

### 集成与测试

- [ ] T-007: 扩展部署脚本（[[11.yd-token-faucet]] 的 `script/DeployTokenFaucet.s.sol` 或新增 `script/DeployAll.s.sol`）：按 design.md「部署与接线顺序」完整部署 5 个合约并完成 `setMinter`/`setCertificate`/`setOracle` 接线，本地 dry-run 验证全链路可跑通一次完整的"创建课程 → 审核 → 上架 → 购买 → 确认完成 → 铸造证书"流程 ~30min
- [ ] T-008: 全量 `forge test`（含 [[11.yd-token-faucet]]、[[12.course-marketplace-contract]] 已有测试不回归）、`forge coverage` 确认本 feature 新增/修改代码行覆盖率 ≥ 90%、`forge fmt --check`、`forge build` 全绿 ~15min

## 依赖关系

- 本 feature 全部任务依赖 [[12.course-marketplace-contract]] 已完成（需要 `Web3University` 的 `hasPurchased`/`courses` 状态）
- T-002 依赖 T-001；T-004 依赖 T-003
- T-005 依赖 T-001（需要 `CourseCertificate` 接口确定后才能在 `Web3University` 里调用）与 [[12.course-marketplace-contract]].T-003（购买逻辑）
- T-006 依赖 T-003、T-005
- T-007 依赖 T-001、T-003、T-005 全部完成
- T-008 依赖 T-001~T-007 全部完成
- 本 feature 完成后，`docs/PRD.md` 第 15 节「里程碑一：合约闭环」全部达成

## 风险点

- 部署循环依赖（`CourseCertificate` 需要知道 `Web3University` 地址、`Web3University` 需要知道 `CourseCertificate`/`DemoCompletionOracle` 地址）必须按 design.md 「先部署、后接线」顺序实现和测试，T-007 的部署脚本是验证这个顺序真实可行的唯一环节，不能只在单元测试里用 mock 地址绕过。
- `markCompleted` 是本 feature 唯一同时涉及"修改 [[12.course-marketplace-contract]] 已交付文件"和"跨合约外部调用"的函数，重入风险和状态一致性是审查重点，T-006 的集成测试必须覆盖"证书合约 revert 时 `completed` 状态一并回滚"这一分支（可通过让 `CourseCertificate` 对同一 `(courseId, student)` 已有证书时 revert 来触发）。
- 本 feature 结束后 `docs/PRD.md` 里程碑一"合约闭环"整体达成，交付前应通读一遍完整流程（创建课程→审核→上架→购买→确认完成→铸造证书）确认没有断点，而不是只看每个任务单独的测试是否通过。
