// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title 私人银行合约
/// @notice 每个钱包地址都可以存入 ETH，但只能查询和取出自己的存款。
contract PrivateBank {
    // 记录每个钱包地址在银行中的余额
    mapping(address => uint256) private balances;

    // 简单的重入锁：转账期间不允许再次进入 withdraw 函数
    bool private locked;

    // 存款和取款事件，方便前端或区块浏览器查询交易记录
    event Deposited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);

    /// @notice 防止重入攻击的函数修饰符
    modifier nonReentrant() {
        require(!locked, "PrivateBank: reentrant call");
        locked = true;
        _;
        locked = false;
    }

    /// @notice 把交易附带的 ETH 存入调用者自己的账户
    function deposit() external payable {
        require(msg.value > 0, "PrivateBank: deposit must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice 从调用者自己的账户中取出指定数量的 ETH
    /// @param amount 取款金额，单位为 wei
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "PrivateBank: amount must be greater than 0");
        require(
            balances[msg.sender] >= amount,
            "PrivateBank: insufficient balance"
        );

        // 先修改余额，再向外转账，遵循 Checks-Effects-Interactions 模式
        balances[msg.sender] -= amount;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "PrivateBank: ETH transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    /// @notice 查询调用者自己的账户余额
    function myBalance() external view returns (uint256) {
        return balances[msg.sender];
    }

    /// @notice 查询银行合约实际持有的 ETH 总额
    function bankBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
