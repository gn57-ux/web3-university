// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ETH 红包合约
/// @notice 创建者存入 ETH，其他钱包可以领取等额或随机金额的红包。
/// @dev 随机模式使用链上数据生成伪随机数，仅适合学习和演示，不适合真实资金场景。
contract EthRedPacket {
    // 红包创建者
    address public immutable creator;

    // true 表示等额红包，false 表示随机红包
    bool public immutable isEqual;

    // 创建时设置的红包总数量
    uint256 public immutable totalCount;

    // 红包领取截止时间（Unix 时间戳）
    uint256 public immutable deadline;

    // 当前剩余金额和剩余数量
    uint256 public remainingAmount;
    uint256 public remainingCount;

    // 创建者是否已经取回过期红包
    bool public refunded;

    // 防止领取或退款时发生重入调用
    bool private locked;

    // 记录每个钱包是否已经领取过红包
    mapping(address => bool) public hasClaimed;

    // 红包领取事件和退款事件
    event Claimed(address indexed claimer, uint256 amount);
    event Refunded(address indexed creator, uint256 amount);

    /// @notice 防止重入攻击的函数修饰符
    modifier nonReentrant() {
        require(!locked, "RedPacket: reentrant call");
        locked = true;
        _;
        locked = false;
    }

    /// @param count 红包数量
    /// @param equalMode true 为等额红包，false 为随机红包
    /// @param durationSeconds 红包有效时间，单位为秒
    constructor(uint256 count, bool equalMode, uint256 durationSeconds) payable {
        require(count > 0, "RedPacket: count must be greater than 0");
        require(
            msg.value >= count,
            "RedPacket: at least 1 wei is required per packet"
        );
        require(
            durationSeconds > 0,
            "RedPacket: duration must be greater than 0"
        );

        creator = msg.sender;
        isEqual = equalMode;
        totalCount = count;
        remainingCount = count;
        remainingAmount = msg.value;
        deadline = block.timestamp + durationSeconds;
    }

    /// @notice 领取一个红包，每个钱包地址只能成功领取一次
    function grabRedPacket() external nonReentrant {
        require(block.timestamp < deadline, "RedPacket: expired");
        require(!refunded, "RedPacket: already refunded");
        require(
            !hasClaimed[msg.sender],
            "RedPacket: caller has already claimed"
        );
        require(remainingCount > 0, "RedPacket: no packets left");

        uint256 amount;

        // 最后一个领取者获得所有剩余金额，避免 ETH 零头留在合约中
        if (remainingCount == 1) {
            amount = remainingAmount;
        } else if (isEqual) {
            // 等额模式：按照当前剩余金额和数量平均分配
            amount = remainingAmount / remainingCount;
        } else {
            // 随机模式：为尚未领取的每个红包至少保留 1 wei
            uint256 maxAmount = remainingAmount - (remainingCount - 1);
            uint256 average = remainingAmount / remainingCount;

            // 单个随机红包最多取平均金额的两倍
            uint256 upperBound = average * 2;
            if (upperBound > maxAmount) upperBound = maxAmount;

            // 使用链上数据生成 1 到 upperBound 之间的教学用伪随机金额
            uint256 randomNumber = uint256(
                keccak256(
                    abi.encodePacked(
                        block.prevrandao,
                        block.timestamp,
                        msg.sender,
                        remainingAmount,
                        remainingCount
                    )
                )
            );
            amount = (randomNumber % upperBound) + 1;
        }

        // 先记录领取状态并扣减余额，再发送 ETH
        hasClaimed[msg.sender] = true;
        remainingCount -= 1;
        remainingAmount -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "RedPacket: ETH transfer failed");
        emit Claimed(msg.sender, amount);
    }

    /// @notice 红包过期后，创建者取回尚未领取的 ETH
    function refund() external nonReentrant {
        require(msg.sender == creator, "RedPacket: only creator");
        require(block.timestamp >= deadline, "RedPacket: not expired yet");
        require(!refunded, "RedPacket: already refunded");

        uint256 amount = remainingAmount;
        require(amount > 0, "RedPacket: nothing to refund");

        // 先清空合约记录，再向创建者转账
        refunded = true;
        remainingAmount = 0;
        remainingCount = 0;

        (bool success, ) = payable(creator).call{value: amount}("");
        require(success, "RedPacket: ETH transfer failed");
        emit Refunded(creator, amount);
    }

    /// @notice 一次查询红包剩余金额、剩余数量和是否过期
    function status()
        external
        view
        returns (uint256 amountLeft, uint256 countLeft, bool expired)
    {
        return (remainingAmount, remainingCount, block.timestamp >= deadline);
    }
}
