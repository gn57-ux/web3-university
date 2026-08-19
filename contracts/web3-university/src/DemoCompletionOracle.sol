// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice `Web3University` 完课确认入口的最小接口声明——本合约只需要调用这一个函数，
///         不引入对 `Web3University` 全量 ABI 的依赖，保持接口窄、耦合低。
interface IWeb3University {
    function markCompleted(address student, uint256 courseId) external;
}

/// @title Demo Completion Oracle
/// @notice 可替换的演示完课预言机：维护受信任提交者白名单，将完课确认转发给
///         `Web3University.markCompleted`。
/// @dev 这是 PRD 目标态"链下预言机网络确认完课"的最简演示实现，仅暴露与生产版本相同的
///      调用接口形状（`confirmCompletion`），不对接任何真实 Chainlink Functions 或链下
///      网络。重复确认防护的单一归属在 `Web3University.completed`（唯一权威状态源）——
///      本合约本身不维护"是否已提交过"的重复状态，若在此处再维护一份，会形成两处独立
///      记录同一事实的重复实现（违反"设计知识只能有一个归属"），且可能因遗漏更新而不
///      一致。`Web3University` 会在重复提交时以 `CourseAlreadyCompleted` 拒绝。
///      权限模型延续 `Web3University`/`YDFaucet` 自实现 `onlyOwner` 的风格。
contract DemoCompletionOracle {
    /// @notice 有权管理受信任提交者白名单的地址，部署后不可更改
    address public immutable owner;

    /// @notice 本预言机转发完课确认的目标核心合约地址，部署后不可更改
    address public immutable web3University;

    /// @notice 地址 => 是否为受信任的完课提交者
    mapping(address => bool) public isTrustedSubmitter;

    /// @notice 受信任提交者白名单状态变更时触发
    event TrustedSubmitterUpdated(address indexed submitter, bool trusted);

    /// @notice 构造函数传入零地址时抛出——owner/web3University 均为 immutable，
    ///         部署后无法修复，零地址会导致管理功能永久不可用（owner）或整个合约
    ///         功能性瘫痪（web3University，所有 confirmCompletion 调用都会失败）
    error ZeroAddress();

    /// @notice 非 owner 调用受限函数时抛出
    error NotOwner();

    /// @notice 非受信任提交者调用 `confirmCompletion` 时抛出
    error NotTrustedSubmitter();

    /// @notice 仅 owner 可调用
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @notice 仅受信任提交者可调用
    modifier onlySubmitter() {
        if (!isTrustedSubmitter[msg.sender]) revert NotTrustedSubmitter();
        _;
    }

    /// @param owner_ 有权管理受信任提交者白名单的地址
    /// @param web3University_ 转发完课确认的目标核心合约地址
    constructor(address owner_, address web3University_) {
        if (owner_ == address(0) || web3University_ == address(0)) revert ZeroAddress();
        owner = owner_;
        web3University = web3University_;
    }

    /// @notice 设置受信任提交者白名单状态
    /// @param submitter 目标地址
    /// @param trusted 是否加入白名单
    function setTrustedSubmitter(address submitter, bool trusted) external onlyOwner {
        isTrustedSubmitter[submitter] = trusted;
        emit TrustedSubmitterUpdated(submitter, trusted);
    }

    /// @notice 受信任提交者确认某学生完成某课程，转发给 `Web3University.markCompleted`；
    ///         重复确认、未购买等业务校验均由 `Web3University` 把关（单一归属，见合约注释）
    /// @param student 学生地址
    /// @param courseId 目标课程 ID
    function confirmCompletion(address student, uint256 courseId) external onlySubmitter {
        IWeb3University(web3University).markCompleted(student, courseId);
    }
}
