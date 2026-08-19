# course-marketplace-contract — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-19 | v1 | 初始任务 |

## 项目信息

- 项目名: web3-university
- 架构类型: 单体仓库（Foundry 子工程）
- specs 路径: specs/12.course-marketplace-contract/

## 任务列表

### 功能 1：老师白名单 + 课程生命周期

- [ ] T-001: 实现 `src/Web3University.sol` 骨架：`Course` struct、`isTeacher`/`courses`/`nextCourseId`、构造函数（接收 `YDToken` 地址与 Owner）、`setTeacher`/`createCourse`/`approveCourse`/`setCourseActive`，自定义 error 与对应事件 ~30min
- [ ] T-002: `test/Web3University.t.sol`（第一部分）：老师白名单权限测试、课程创建/审核/上下架的状态机测试（含非法转换：未审核不能上架、非本人老师不能操作、课程不存在） ~30min

### 功能 2：购买与购买记录

- [ ] T-003: 在 `Web3University.sol` 追加 `buyCourse`（`nonReentrant`、`SafeERC20.safeTransferFrom`、价格读取自 `courses[courseId].price`）、`Purchase` struct、`hasPurchased`/`purchaseOf` mapping ~30min
- [ ] T-004: `test/Web3University.t.sol`（第二部分）：购买成功路径（余额/事件/购买记录正确）、余额不足、授权不足、未上架/未审核课程购买 revert、重复购买 revert、**两门不同价格课程验证价格确实来自各自的链上配置而非硬编码** ~30min

### 集成与测试

- [ ] T-005: 扩展 [[11.yd-token-faucet]] 的 `script/DeployTokenFaucet.s.sol`（或新增 `script/DeployMarketplace.s.sol`）：部署 `Web3University` 并传入已部署的 `YDToken` 地址，本地 dry-run 验证 ~15min
- [ ] T-006: `forge coverage` 确认 `Web3University.sol` 本次新增代码行覆盖率 ≥ 90%；`forge fmt --check`、`forge build`、全量 `forge test` 全绿（含 [[11.yd-token-faucet]] 已有测试不回归） ~15min

## 依赖关系

- 本 feature 全部任务依赖 [[11.yd-token-faucet]] 已完成（需要 `YDToken` 合约与 Foundry 工程骨架）
- T-002 依赖 T-001；T-004 依赖 T-003
- T-005 依赖 T-003（购买逻辑完成后部署脚本才有意义部署完整市场合约）
- T-006 依赖 T-001~T-005 全部完成
- 本 feature 是 [[13.course-certificate-completion]] 的前置依赖：13 会在 `Web3University.sol` 基础上追加完课确认与证书铸造调用

## 风险点

- `buyCourse` 的价格来源是本 feature 最容易被审查抓到的点：任何形式的"函数体内出现具体数值常量参与价格计算"都必须视为违反 F-005，测试用例（T-004）必须显式用两门不同价格的课程验证。
- `setCourseActive` 的权限归属（课程老师本人而非 Owner）如果实现时写反（例如误用 `onlyOwner`），会导致老师无法自主管理自己的课程，T-002 的测试用例需要显式覆盖"Owner 尝试上下架不属于自己创建的课程应该 revert"这一分支（Owner 本身也不是任何课程的 `teacher`，除非 Owner 地址恰好也被加入白名单并创建了课程）。
- 本 feature 的 `Web3University.sol` 会在 [[13.course-certificate-completion]] 被追加新函数/状态，实现时应把当前范围内的函数職责保持清晰独立（不要求预留扩展接口，但也不要写出难以追加新函数的强耦合结构，如把所有逻辑塞进一个巨型函数）。
