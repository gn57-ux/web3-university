// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";
import {YDToken} from "../src/YDToken.sol";
import {Web3University} from "../src/Web3University.sol";

/// @title 本地部署脚本：YDToken + Web3University
/// @notice 仅用于 `forge script script/DeployMarketplace.s.sol`（不带 `--broadcast`、
///         不带 `--rpc-url` 指向真实网络）在本地模拟验证部署流程，不产生任何链上交易。
/// @dev `vm.startBroadcast()` 不传入任何私钥参数，使用 Foundry 默认测试签名者；
///      脚本不读取任何 `.env`/`.env.local`、不硬编码私钥或 RPC URL。
///      真实部署（含私钥/RPC）不在本 feature 范围内，需用户显式提供密钥后另行执行。
///      与 [[11.yd-token-faucet]] 的 `DeployTokenFaucet.s.sol` 分开成独立脚本，避免
///      两个 feature 的部署产物耦合在同一份脚本里（Faucet 不是 Web3University 的依赖）。
contract DeployMarketplace is Script {
    uint256 internal constant INITIAL_SUPPLY = 1_000_000e18;

    function run() external {
        vm.startBroadcast();

        YDToken token = new YDToken(msg.sender, INITIAL_SUPPLY);
        new Web3University(address(token), msg.sender);

        vm.stopBroadcast();
    }
}
