# onchain-completion-certificate — 需求规格

## 概述

打通"完课确认"到"NFT 证书展示"的链上真实链路：调用 [[13.course-certificate-completion]] 的 `DemoCompletionOracle`/`Web3University.markCompleted` 触发完成确认与证书铸造，个人中心"NFT 证书"Tab 改为读取 `CourseCertificate` 合约的真实 `tokenId`/`tokenURI`/`ownerOf`，替换 [[6.profile-center]] 的 Mock 证书展示。

## 项目信息

- 项目名: web3-university
- 架构类型: 单体仓库

## 需求版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-20 | v1 | 初始需求 |

## 用户故事

- 作为学生，完成课程学习后，我想要一个明确的"确认完成"动作触发真实的完课确认与证书铸造。
- 作为学生，我想要在个人中心看到我真实拥有的 NFT 证书（tokenId、课程信息、拥有者地址），而不是假数据。
- 作为审计者，我想要确认同一学生同一课程不会被铸造出两枚证书，UI 层也要如实反映这一点（重复触发完课确认时给出明确提示而不是静默重复）。

## 功能需求

1. [F-001] 完课确认触发：本地演示场景下，学习中心"完课"动作（现有 Mock 的"标记本章完成"最后一步）改为调用受信任提交者账户对 `DemoCompletionOracle.confirmCompletion(student, courseId)` 发起真实交易——受信任提交者是本地部署时配置的一个测试账户（非当前登录学生本人，因为合约设计上是"可信第三方確認"而非"自证"），前端只能用**已知拥有该私钥的本地测试账户**触发，具体机制在 design.md 中给出（不使用真实私钥硬编码在前端）。
2. [F-002] 完课状态读取：`Web3University.completed(courseId, student)` 作为"是否已完成"的权威来源，替换学习中心/个人中心现有的本地完成态展示。
3. [F-003] NFT 证书查询：个人中心"NFT 证书"Tab 改为对已知种子课程逐一查询 `CourseCertificate.hasCertificate(courseId, student)`，命中的再查 `certificateData(tokenId)`/`tokenURI(tokenId)`/`ownerOf(tokenId)` 展示 tokenId、课程名称、完成时间、`tokenURI`（本阶段 `tokenURI` 内容是课程 `metadataURI` 字符串本身，不要求能渲染成图片，展示原始字符串即可）。
4. [F-004] 重复确认处理：对已完成课程再次触发确认，合约会 revert（`CourseAlreadyCompleted`），前端需要用 [[14.contract-client-foundation]] 的统一错误映射给出"已完成，无需重复确认"这类明确中文提示，不能让用户以为操作失败或卡住。
5. [F-005] 未购买课程的完成尝试：合约会 revert（`CourseNotPurchased`），前端触发入口本身应该只在学习中心课程内容可见时才出现（购课门禁已经保证只有已购买学生能进学习中心），属于纵深防御而非首要拦截手段。

## 非功能需求

- 安全: 触发完课确认所需的"受信任提交者"私钥**不得**以任何形式出现在前端代码、环境变量、浏览器可访问的位置；具体隔离方案见 design.md。
- 一致性: 证书展示与完课状态必须来自链上真实读取，个人中心和学习中心对"是否完成"的判断必须是同一个数据源（`Web3University.completed`），不允许两处出现不一致的展示。
- 兼容性: 不改变 [[13.course-certificate-completion]] 已交付的合约接口；不改变学习中心视频/章节/评论等与完课无关的既有 Mock 交互。

## 依赖

- [[14.contract-client-foundation]]、[[15.onchain-token-course-purchase]]
- [[13.course-certificate-completion]] 的 `DemoCompletionOracle`/`Web3University`/`CourseCertificate`

## 开放问题

- 无（"受信任提交者如何在本地演示环境下安全触发"这一具体机制由 design.md 给出技术方案，不需要用户预先决策——本阶段是本地 Anvil 演示环境，不涉及真实资金/生产密钥管理）。
