# course-certificate-completion — 需求规格

## 概述

实现 `CourseCertificate`（ERC-721 课程完成证书）与 `DemoCompletionOracle`（可替换的演示完课预言机），并扩展 [[12.course-marketplace-contract]] 的 `Web3University`，打通"可信预言机提交完课状态 → 核心合约记录完成 → 调用证书合约铸造唯一 NFT"的完整链路，对应 `docs/PRD.md` 第 15 节「里程碑一：合约闭环」的收尾。

## 项目信息

- 项目名: web3-university
- 架构类型: 单体仓库（Foundry 子工程 `contracts/web3-university/`）

## 需求版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-19 | v1 | 初始需求 |

## 用户故事

- 作为学生，我想要在完成课程后获得一枚唯一的 NFT 证书，以便证明我的学习成果。
- 作为受信任的后端/管理员，我想要通过预言机合约提交完课确认，以便课程完成状态可信地写入链上。
- 作为审计者，我想要确认同一学生对同一课程不可能获得两枚证书，也不可能在未购买该课程的情况下获得证书。

## 功能需求

1. [F-001] `CourseCertificate` 标准：ERC-721（基于 OpenZeppelin `ERC721`）；只有被授权的"核心合约"地址（即 [[12.course-marketplace-contract]] 的 `Web3University`）可以铸造；铸造时记录课程 ID、学生地址、完成时间，`tokenURI` 由调用方（`Web3University`）在铸造时传入。
2. [F-002] 每个地址对每门课程最多获得一枚证书：重复铸造同一 `(student, courseId)` 组合必须 revert（自定义 error），不得铸造出第二枚。
3. [F-003] 铸造成功发出 `CertificateMinted(address indexed student, uint256 indexed courseId, uint256 indexed tokenId)` 事件。
4. [F-004] `DemoCompletionOracle`：维护受信任提交者地址集合（Owner 可增删）；`confirmCompletion(address student, uint256 courseId)` 仅受信任提交者可调用，内部调用 `Web3University` 的完课确认入口；非受信任地址调用必须 revert。
5. [F-005] `Web3University` 扩展：新增 `completed` 状态（`courseId => student => bool`）、`oracle` 地址（可由 Owner 设置一次性授权哪个 `DemoCompletionOracle` 实例可以提交完课）、`certificate` 地址（`CourseCertificate` 实例）；新增 `markCompleted(address student, uint256 courseId)` 仅 `oracle` 地址可调用：要求该学生已购买该课程（`hasPurchased`）、尚未标记完成，标记完成后调用 `CourseCertificate.mint(...)` 铸造证书，发出 `CourseCompleted(student, courseId, completedAt)` 事件。
6. [F-006] 防止重复确认与重复铸造：同一 `(student, courseId)` 组合的 `markCompleted` 第二次调用必须 revert，不产生第二次证书铸造调用。
7. [F-007] 未购买课程的学生不能被标记为完成（`markCompleted` 校验 `hasPurchased[courseId][student]`，否则 revert）。
8. [F-008] `CourseCertificate` 的授权铸造者（`Web3University` 地址）与 `Web3University` 的授权预言机（`DemoCompletionOracle` 地址）均通过 Owner 一次性设置的方式完成部署后接线（constructor 参数循环依赖时无法一次构造完成，需要 `onlyOwner` 的设置函数），全部使用自定义 error 与访问控制。

## 非功能需求

- 安全: 与 [[11.yd-token-faucet]]、[[12.course-marketplace-contract]] 相同的审计清单要求；`markCompleted` 涉及跨合约调用（铸造证书），附加重入保护。
- 测试: `forge coverage` 针对本 feature 新增/修改代码行覆盖率不低于 90%；覆盖完整链路集成测试（提交者 → Oracle → Web3University → CourseCertificate）。
- 兼容性: 不修改 [[11.yd-token-faucet]] 交付的 `YDToken.sol`/`YDFaucet.sol`；对 [[12.course-marketplace-contract]] 交付的 `Web3University.sol` 只做新增（新状态变量、新函数、新事件），不改动其已实现的 `setTeacher`/`createCourse`/`approveCourse`/`setCourseActive`/`buyCourse` 签名与行为。
- 不做: 不实现 Chainlink Functions 或任何真实链下预言机网络对接；`DemoCompletionOracle` 是可替换的演示实现，仅暴露与生产版本相同的调用接口形状。

## 依赖

- [[12.course-marketplace-contract]] 已完成的 `Web3University`（`hasPurchased` 状态、待扩展的完课入口）
- [[11.yd-token-faucet]] 建立的 Foundry 工程骨架
- OpenZeppelin `ERC721`

## 开放问题

- 无（技术选型与业务规则已在用户指令与 PRD 第 7.4/7.5 节明确）。
