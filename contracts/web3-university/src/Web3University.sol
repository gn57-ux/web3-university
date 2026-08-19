// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Web3 University 课程市场
/// @notice 老师白名单管理、课程创建/审核/上下架、学生用 YD Token 购买课程。
/// @dev 权限模型自实现 `onlyOwner`（构造函数一次性设定，不可转移），与
///      [[11.yd-token-faucet]] 的 `YDFaucet` 保持一致——MVP 阶段不需要转移治理权限，
///      固定 owner 更简单、攻击面更小。`buyCourse()` 遵循 Checks-Effects-Interactions，
///      并叠加 OpenZeppelin `ReentrancyGuard`，与团队既有合约风格
///      （`contracts/PrivateBank.sol`/`EthRedPacket.sol`/`YDFaucet.sol`）保持一致。
///      本合约是 [[13.course-certificate-completion]] 的前置依赖：13 会在此基础上追加
///      完课确认与证书铸造调用，因此当前范围内的函数职责保持清晰独立，不预留扩展接口。
contract Web3University is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice 课程信息
    struct Course {
        address teacher; // 创建该课程的老师地址
        uint256 price; // 课程价格，YD 最小单位（18 位小数）
        string metadataURI; // 课程元数据（标题/简介/封面等）的链下引用
        bool approved; // 是否已通过 Owner 审核
        bool active; // 是否已上架（可购买）
    }

    /// @notice 购买记录
    struct Purchase {
        address student; // 购买者地址
        uint256 courseId; // 所购课程 ID
        uint256 pricePaid; // 实际支付价格（购买时刻的 course.price 快照）
        uint256 purchasedAt; // 购买时间戳
    }

    /// @notice 本合约用于结算课程款项的 YD Token 合约地址，部署后不可更改
    IERC20 public immutable ydToken;

    /// @notice 有权管理老师白名单、审核课程的管理地址，部署后不可更改
    address public immutable owner;

    /// @notice 地址 => 是否为白名单老师
    mapping(address => bool) public isTeacher;

    /// @notice 课程 ID => 课程信息
    mapping(uint256 => Course) public courses;

    /// @notice 下一个待分配的课程 ID；courseId 从 1 开始自增，0 保留作"不存在"哨兵值，
    ///         不需要额外的 exists 布尔字段（不存在状态由 ID 范围本身表达，单一数据来源）
    uint256 public nextCourseId;

    /// @notice courseId => student => 是否已购买
    mapping(uint256 => mapping(address => bool)) public hasPurchased;

    /// @notice courseId => student => 购买记录（用于链上查询展示购买价格/时间）
    mapping(uint256 => mapping(address => Purchase)) public purchaseOf;

    /// @notice 老师白名单状态变更时触发
    event TeacherUpdated(address indexed teacher, bool enabled);

    /// @notice 课程创建成功时触发
    event CourseCreated(
        uint256 indexed courseId, address indexed teacher, uint256 price, string metadataURI
    );

    /// @notice 课程审核通过时触发
    event CourseApproved(uint256 indexed courseId);

    /// @notice 课程上/下架状态变更时触发
    event CourseStatusChanged(uint256 indexed courseId, bool active);

    /// @notice 课程购买成功时触发
    event CoursePurchased(
        address indexed student, uint256 indexed courseId, uint256 price, uint256 purchasedAt
    );

    /// @notice 构造函数传入零地址时抛出——owner/ydToken 均为 immutable，
    ///         部署后无法修复，零地址会导致管理功能永久不可用（owner）
    ///         或整个合约功能性瘫痪（ydToken）
    error ZeroAddress();

    /// @notice 非 owner 调用受限函数时抛出
    error NotOwner();

    /// @notice 非白名单老师调用受限函数时抛出
    error NotWhitelistedTeacher();

    /// @notice 创建课程时价格为 0 时抛出——价格为 0 没有业务意义，输入阶段就该拒绝
    error InvalidPrice();

    /// @notice 操作不存在的课程时抛出
    error CourseNotFound();

    /// @notice 重复审核已通过的课程时抛出
    error CourseAlreadyApproved();

    /// @notice 非该课程所属老师调用课程专属操作时抛出
    error NotCourseTeacher();

    /// @notice 课程未通过审核却尝试上架时抛出
    error CourseNotApproved();

    /// @notice 课程未审核或未上架却尝试购买时抛出
    error CourseNotAvailable();

    /// @notice 同一学生重复购买同一课程时抛出
    error AlreadyPurchased();

    /// @notice 仅 owner 可调用
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @notice 仅白名单老师可调用
    modifier onlyTeacher() {
        if (!isTeacher[msg.sender]) revert NotWhitelistedTeacher();
        _;
    }

    /// @param ydToken_ 用于结算课程款项的 YD Token 合约地址
    /// @param owner_ 有权管理老师白名单、审核课程的管理地址
    constructor(address ydToken_, address owner_) {
        if (ydToken_ == address(0) || owner_ == address(0)) revert ZeroAddress();
        ydToken = IERC20(ydToken_);
        owner = owner_;
    }

    /// @notice 设置老师白名单状态
    /// @param teacher 目标地址
    /// @param enabled 是否加入白名单
    function setTeacher(address teacher, bool enabled) external onlyOwner {
        isTeacher[teacher] = enabled;
        emit TeacherUpdated(teacher, enabled);
    }

    /// @notice 白名单老师创建课程，初始状态未审核（`approved = false`）、未上架（`active = false`）
    /// @param price 课程价格（YD 最小单位）
    /// @param metadataURI 课程元数据的链下引用
    /// @return courseId 新创建课程的 ID
    function createCourse(uint256 price, string calldata metadataURI)
        external
        onlyTeacher
        returns (uint256 courseId)
    {
        if (price == 0) revert InvalidPrice();

        courseId = ++nextCourseId;
        courses[courseId] = Course({
            teacher: msg.sender,
            price: price,
            metadataURI: metadataURI,
            approved: false,
            active: false
        });

        emit CourseCreated(courseId, msg.sender, price, metadataURI);
    }

    /// @notice Owner 审核课程通过
    /// @param courseId 目标课程 ID
    function approveCourse(uint256 courseId) external onlyOwner {
        _requireCourseExists(courseId);
        if (courses[courseId].approved) revert CourseAlreadyApproved();

        courses[courseId].approved = true;

        emit CourseApproved(courseId);
    }

    /// @notice 课程所属老师上架/下架自己的课程；上架要求课程已通过审核，下架无前置条件
    /// @param courseId 目标课程 ID
    /// @param active 目标状态：true 上架，false 下架
    function setCourseActive(uint256 courseId, bool active) external {
        _requireCourseExists(courseId);
        Course storage course = courses[courseId];

        if (msg.sender != course.teacher) revert NotCourseTeacher();
        if (active && !course.approved) revert CourseNotApproved();

        course.active = active;

        emit CourseStatusChanged(courseId, active);
    }

    /// @notice 学生购买已上架课程，价格从课程配置读取，款项直接结算给课程老师地址
    /// @param courseId 目标课程 ID
    function buyCourse(uint256 courseId) external nonReentrant {
        _requireCourseExists(courseId);
        Course storage course = courses[courseId];

        // Checks
        if (!course.approved || !course.active) revert CourseNotAvailable();
        if (hasPurchased[courseId][msg.sender]) revert AlreadyPurchased();

        // 价格来自链上课程配置，绝不在此处硬编码具体数值（F-005 强制要求）
        uint256 price = course.price;
        address teacher = course.teacher;
        uint256 purchasedAt = block.timestamp;

        // Effects：先完成全部状态写入，再做外部转账
        hasPurchased[courseId][msg.sender] = true;
        purchaseOf[courseId][msg.sender] = Purchase({
            student: msg.sender, courseId: courseId, pricePaid: price, purchasedAt: purchasedAt
        });

        // Interactions：购买款项直接结算给课程老师地址，不在本合约内滞留资金
        ydToken.safeTransferFrom(msg.sender, teacher, price);

        emit CoursePurchased(msg.sender, courseId, price, purchasedAt);
    }

    /// @dev 课程不存在时 revert `CourseNotFound`。`nextCourseId` 在 `createCourse` 中以
    ///      `++nextCourseId` 前缀自增后赋给新课程 ID，因此已创建课程的合法 ID 范围是
    ///      `[1, nextCourseId]`（闭区间），越界判断需用 `>` 而非 `>=`。
    function _requireCourseExists(uint256 courseId) private view {
        if (courseId == 0 || courseId > nextCourseId) revert CourseNotFound();
    }
}
