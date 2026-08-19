# course-marketplace-contract — 需求规格

## 概述

实现核心课程市场合约 `Web3University`：老师白名单管理、课程创建/审核/上下架、YD Token 购买、链上可验证购买记录。依赖 [[11.yd-token-faucet]] 提供的 `YDToken`。完课确认与证书铸造属于 [[13.course-certificate-completion]]，本 feature 只搭建被 13 扩展的基础结构。

## 项目信息

- 项目名: web3-university
- 架构类型: 单体仓库（Foundry 子工程 `contracts/web3-university/`）

## 需求版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-19 | v1 | 初始需求 |

## 用户故事

- 作为 Owner，我想要管理老师白名单，以便只有授权老师能上架课程。
- 作为老师，我想要提交课程并等待审核，审核通过后能够上架/下架自己的课程。
- 作为学生，我想要用 YD Token 购买已上架课程，并且合约能阻止我重复购买或购买未上架课程。
- 作为审计者，我想要课程价格始终从链上课程配置读取，而不是在购买函数里被硬编码，以便修改定价不需要改动合约逻辑。

## 功能需求

1. [F-001] 老师白名单：`setTeacher(address teacher, bool enabled)` 仅 Owner 可调用，发出 `TeacherUpdated(teacher, enabled)` 事件；非白名单地址调用创建课程的接口必须 revert。
2. [F-002] 课程创建：`createCourse(uint256 price, string calldata metadataURI)` 仅白名单老师可调用；生成自增 `courseId`，初始 `approved = false`、`active = false`；发出 `CourseCreated(courseId, teacher, price, metadataURI)` 事件。
3. [F-003] 课程审核：`approveCourse(uint256 courseId)` 仅 Owner 可调用；将对应课程 `approved` 置为 `true`；发出 `CourseApproved(courseId)` 事件；对不存在或已审核过的课程 revert。
4. [F-004] 课程上下架：`setCourseActive(uint256 courseId, bool active)` 仅该课程的老师本人可调用；要求课程已通过审核（`approved == true`）才允许上架（`active = true`）；下架（`active = false`）不要求任何前置条件；发出 `CourseStatusChanged(courseId, active)` 事件。
5. [F-005] 购买课程：`buyCourse(uint256 courseId)`；要求课程存在、`approved && active`、调用者未购买过该课程；价格 **从课程结构体的 `price` 字段读取**（不得在函数体内硬编码任何具体数值，如 4 YD）；通过 `SafeERC20.safeTransferFrom` 从学生地址扣款转给该课程老师地址；写入购买记录（`student`/`courseId`/`pricePaid`/`purchasedAt`）；发出 `CoursePurchased(student, courseId, price, purchasedAt)` 事件。
6. [F-006] 防重复购买：同一学生对同一课程只能成功调用一次 `buyCourse`，第二次调用必须 revert（自定义 error），且不产生任何状态变化或代币转移。
7. [F-007] 未上架/未审核课程购买保护：`approved == false` 或 `active == false` 的课程调用 `buyCourse` 必须 revert，不得部分执行或静默跳过。
8. [F-008] 全部权限校验、状态不存在校验使用自定义 error（非 `require` 字符串），并遵循 Checks-Effects-Interactions 顺序；`buyCourse` 附加重入保护。

## 非功能需求

- 安全: 与 [[11.yd-token-faucet]] 相同的审计清单要求；`buyCourse` 涉及外部 Token 转账，必须 `nonReentrant`。
- 测试: `forge coverage` 针对本 feature 新增/修改代码的行覆盖率不低于 90%。
- 兼容性: 本 feature 会新建 `Web3University.sol`；[[13.course-certificate-completion]] 会在其基础上追加完课/证书相关字段与函数，本 feature 交付的接口（`setTeacher`/`createCourse`/`approveCourse`/`setCourseActive`/`buyCourse`）不得因未来扩展而产生破坏性签名变更。
- 不做: 不实现课程退款、不实现老师收入提现池（购买款项在 `buyCourse` 内直接结算给老师地址，不在合约内滞留资金，从架构上消除"需要退款/提现"的场景）。

## 依赖

- [[11.yd-token-faucet]] 已完成的 `YDToken`（本 feature 的 `Web3University` 构造函数需要接收其地址）
- OpenZeppelin `SafeERC20`（已随 11 引入依赖）

## 开放问题

- 无（技术选型与业务规则已在用户指令与 PRD 第 7.3 节明确）。
