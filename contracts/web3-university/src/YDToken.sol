// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title YD Token
/// @notice Web3 University 课程支付代币，标准 ERC-20。
/// @dev 完全复用 OpenZeppelin `ERC20` 的 transfer/approve/transferFrom/balanceOf/allowance，
///      不重写任何方法；不提供部署后追加铸造的入口——初始供应量在构造函数一次性铸造完毕，
///      避免预留当前需求不支撑的增发权限攻击面（见 specs/11.yd-token-faucet/design.md 模块 1）。
contract YDToken is ERC20 {
    /// @notice 部署时一次性铸造初始供应量到指定地址
    /// @param initialHolder 初始供应量的接收地址
    /// @param initialSupply 初始供应量（最小单位，18 位小数）
    constructor(address initialHolder, uint256 initialSupply) ERC20("YD Token", "YD") {
        _mint(initialHolder, initialSupply);
    }
}
