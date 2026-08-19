# course-marketplace-contract — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-19 | v1 | 初始设计 |

## 项目架构

- 架构类型: 单体仓库，沿用 [[11.yd-token-faucet]] 建立的 Foundry 子工程 `contracts/web3-university/`
- 涉及层: 智能合约（Solidity + Foundry + OpenZeppelin）
- 架构决策（单体 vs 分离合约）已在 [[11.yd-token-faucet]] design.md 中完成，本 feature 沿用其结论：`Web3University` 是分离架构中的核心业务合约，只持有 `YDToken` 地址引用，不内联 Token 逻辑。

## 功能模块设计

### 模块 1：老师白名单 + 课程生命周期

**数据模型**：

```solidity
struct Course {
    address teacher;
    uint256 price;        // YD 最小单位
    string metadataURI;
    bool approved;
    bool active;
}

mapping(address => bool) public isTeacher;
mapping(uint256 => Course) public courses;
uint256 public nextCourseId; // 自增 ID，从 1 开始（0 保留作"不存在"哨兵值）
```

- `courseId` 从 1 开始自增：`courses[0]` 恒不存在，函数内用 `courseId == 0 || courseId > nextCourseId` 快速判断"课程不存在"（`createCourse` 用 `++nextCourseId` 前缀自增后赋给新课程，已创建课程的合法 ID 范围是闭区间 `[1, nextCourseId]`，越界判断必须用 `>` 而非 `>=`——初版此处写成 `>=` 是一个 off-by-one 错误，会把刚创建的课程自己判定为不存在，实现阶段已修正），不需要额外的 `exists` 布尔字段（信息隐藏：不存在状态由 ID 范围本身表达，不重复存储）。

**接口契约**：

- `setTeacher(address teacher, bool enabled) external onlyOwner`：`isTeacher[teacher] = enabled`；`emit TeacherUpdated(teacher, enabled)`。
- `createCourse(uint256 price, string calldata metadataURI) external onlyTeacher returns (uint256 courseId)`：
  - Checks：`price == 0` → revert `InvalidPrice()`（价格为 0 没有业务意义，构造函数/输入阶段就该拒绝，而不是留到购买时才发现异常）。
  - Effects：`courseId = ++nextCourseId; courses[courseId] = Course(msg.sender, price, metadataURI, false, false);`
  - `emit CourseCreated(courseId, msg.sender, price, metadataURI)`。
- `approveCourse(uint256 courseId) external onlyOwner`：
  - Checks：课程不存在 → revert `CourseNotFound()`；已审核过 → revert `CourseAlreadyApproved()`。
  - Effects：`courses[courseId].approved = true`。
  - `emit CourseApproved(courseId)`。
- `setCourseActive(uint256 courseId, bool active) external`：
  - Checks：课程不存在 → revert `CourseNotFound()`；`msg.sender != courses[courseId].teacher` → revert `NotCourseTeacher()`；`active == true && !courses[courseId].approved` → revert `CourseNotApproved()`。
  - Effects：`courses[courseId].active = active`。
  - `emit CourseStatusChanged(courseId, active)`。

**权限修饰符**：

```solidity
modifier onlyOwner() {
    if (msg.sender != owner) revert NotOwner();
    _;
}

modifier onlyTeacher() {
    if (!isTeacher[msg.sender]) revert NotWhitelistedTeacher();
    _;
}
```

`owner` 通过构造函数一次性设定（与 [[11.yd-token-faucet]] 的 `YDFaucet` 一致，不使用可转移所有权的 OZ `Ownable`，理由相同：MVP 阶段不需要转移治理权限）。

### 模块 2：购买与购买记录

**数据模型**：

```solidity
struct Purchase {
    address student;
    uint256 courseId;
    uint256 pricePaid;
    uint256 purchasedAt;
}

mapping(uint256 => mapping(address => bool)) public hasPurchased; // courseId => student => 是否已购买
mapping(uint256 => mapping(address => Purchase)) public purchaseOf; // courseId => student => 购买记录（用于链上查询展示购买价格/时间）
```

**接口契约**：

```solidity
function buyCourse(uint256 courseId) external nonReentrant {
    Course storage course = courses[courseId];
    if (courseId == 0 || courseId > nextCourseId) revert CourseNotFound();
    if (!course.approved || !course.active) revert CourseNotAvailable();
    if (hasPurchased[courseId][msg.sender]) revert AlreadyPurchased();

    uint256 price = course.price; // 价格来自链上课程配置，绝不在此处硬编码具体数值（F-005 强制要求）
    hasPurchased[courseId][msg.sender] = true;
    purchaseOf[courseId][msg.sender] = Purchase(msg.sender, courseId, price, block.timestamp);

    ydToken.safeTransferFrom(msg.sender, course.teacher, price);

    emit CoursePurchased(msg.sender, courseId, price, block.timestamp);
}
```

- Checks-Effects-Interactions：先完成全部校验和状态写入（`hasPurchased`/`purchaseOf`），最后才做外部 `safeTransferFrom` 调用，`nonReentrant` 双重防护（OpenZeppelin `ReentrancyGuard`）。
- 购买款项**直接结算给课程老师地址**，不在 `Web3University` 合约内滞留资金——从架构上消除"需要退款/提现池"的场景（用户明确要求不实现退款），也避免合约持有大额资金成为额外攻击面。
- 价格来源单一：`course.price` 是唯一权威来源，`buyCourse` 只读取、不重新计算或覆盖，满足"课程价格读取链上课程配置，不写死"的强约束。

## 接口契约（合约级 ABI 摘要）

| 函数 | 权限 | 说明 |
| --- | --- | --- |
| `setTeacher(address, bool)` | Owner | 老师白名单 |
| `createCourse(uint256, string)` | 白名单老师 | 创建课程，返回 `courseId` |
| `approveCourse(uint256)` | Owner | 审核通过 |
| `setCourseActive(uint256, bool)` | 课程所属老师 | 上/下架 |
| `buyCourse(uint256)` | 任意地址（需持有并授权足额 YD） | 购买课程 |
| `courses(uint256)` | 只读 | 课程详情（公开 mapping getter） |
| `hasPurchased(uint256, address)` | 只读 | 是否已购买 |
| `purchaseOf(uint256, address)` | 只读 | 购买记录（价格、时间） |

## 数据模型

见上文模块 1、2 的 `Course`/`Purchase` struct 定义；`nextCourseId` 作为课程存在性判断的隐式依据（避免额外冗余字段）。

## 安全考虑

- `buyCourse` 是本 feature 唯一的外部资金流动函数，附加 `nonReentrant` + 严格 CEI 顺序。
- 价格单一来源（`course.price`），杜绝"链上配置和购买函数各说各话"的不一致风险。
- 课程上架前置校验（`approved` 才能 `active`）确保未经 Owner 审核的课程不可能被购买到，即使老师自己想绕过审核直接上架。
- 老师只能操作自己名下课程的上下架，无法操作其他老师的课程（`NotCourseTeacher` 校验）。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 购买款项流向 | 直接转给课程老师，不滞留在合约 | 消除退款/提现池需求（用户明确排除退款范围），减少合约持有资金的攻击面 |
| 课程存在性判断 | 用 `courseId` 范围推导，不加 `exists` 字段 | 避免冗余状态，单一数据来源 |
| Owner 权限模型 | 自实现固定 Owner，不用可转移的 `Ownable` | 与 [[11.yd-token-faucet]] 保持一致的最小攻击面选择 |
| 重入保护 | `buyCourse` 加 `nonReentrant` | 涉及外部 Token 转账，即使 `YDToken` 本身无 hook，仍作为纵深防御与团队既有合约风格（`PrivateBank.sol`/`EthRedPacket.sol`）保持一致 |
