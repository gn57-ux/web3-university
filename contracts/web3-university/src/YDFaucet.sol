// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title YD Faucet
/// @notice 测试网水龙头：每个地址限领一次固定数量的 YD Token。
/// @dev 权限模型自实现 `onlyOwner`（构造函数一次性设定，不可转移），不使用 OpenZeppelin
///      `Ownable`——MVP 阶段不需要转移 Faucet 管理权，固定 owner 更简单、攻击面更小。
///      `claim()`/`fund()` 均遵循 Checks-Effects-Interactions，并叠加 OpenZeppelin
///      `ReentrancyGuard`，与 `.claude/rules/smart-contract.md` 审计清单「复用现有重入锁
///      模式」的要求保持一致（`contracts/PrivateBank.sol`/`EthRedPacket.sol` 均对外部调用
///      函数使用 `nonReentrant`）。
contract YDFaucet is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice 本水龙头分发的 YD Token 合约地址，部署后不可更改
    IERC20 public immutable ydToken;

    /// @notice 有权调用 fund() 补充资金的管理地址，部署后不可更改
    address public immutable owner;

    /// @notice 每个地址每次领取的固定数量：20 YD（最小单位 20e18）
    uint256 public constant CLAIM_AMOUNT = 20e18;

    /// @notice 地址 => 是否已领取过，确保每个地址仅能领取一次
    mapping(address => bool) public hasClaimed;

    /// @notice 领取成功时触发
    /// @param student 领取者地址
    /// @param amount 领取数量
    event TokensClaimed(address indexed student, uint256 amount);

    /// @notice Owner 补充 Faucet 资金成功时触发
    /// @param funder 出资地址（即 owner）
    /// @param amount 补充数量
    event FaucetFunded(address indexed funder, uint256 amount);

    /// @notice 已领取过时抛出
    error AlreadyClaimed();

    /// @notice Faucet 余额不足以支付本次领取时抛出
    error InsufficientFaucetBalance();

    /// @notice 非 owner 调用受限函数时抛出
    error NotOwner();

    /// @notice 构造函数传入零地址时抛出——owner/ydToken 均为 immutable，
    ///         部署后无法修复，零地址会导致 fund() 永久不可用（owner）
    ///         或整个合约功能性瘫痪（ydToken）
    error ZeroAddress();

    /// @notice 仅 owner 可调用
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @param ydToken_ 本水龙头分发的 YD Token 合约地址
    /// @param owner_ 有权补充资金的管理地址
    constructor(address ydToken_, address owner_) {
        if (ydToken_ == address(0) || owner_ == address(0)) revert ZeroAddress();
        ydToken = IERC20(ydToken_);
        owner = owner_;
    }

    /// @notice 每个地址仅可调用一次，领取固定数量（20 YD）的 YD Token
    function claim() external nonReentrant {
        // Checks：已领取过 / Faucet 余额不足，均需明确拒绝，不得静默失败
        if (hasClaimed[msg.sender]) revert AlreadyClaimed();
        if (ydToken.balanceOf(address(this)) < CLAIM_AMOUNT) {
            revert InsufficientFaucetBalance();
        }

        // Effects：先标记已领取，再做外部转账
        hasClaimed[msg.sender] = true;

        // Interactions
        ydToken.safeTransfer(msg.sender, CLAIM_AMOUNT);

        emit TokensClaimed(msg.sender, CLAIM_AMOUNT);
    }

    /// @notice 仅 owner 可调用，从 owner 地址拉取 YD 补充至 Faucet
    /// @dev owner 需先对本合约地址完成 `approve(amount)`
    /// @param amount 补充数量
    function fund(uint256 amount) external onlyOwner nonReentrant {
        ydToken.safeTransferFrom(msg.sender, address(this), amount);
        emit FaucetFunded(msg.sender, amount);
    }
}
