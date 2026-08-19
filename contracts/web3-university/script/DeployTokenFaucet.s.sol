// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";
import {YDToken} from "../src/YDToken.sol";
import {YDFaucet} from "../src/YDFaucet.sol";

/// @title 本地部署脚本：YDToken + YDFaucet
/// @notice 仅用于 `forge script script/DeployTokenFaucet.s.sol`（不带 `--broadcast`、
///         不带 `--rpc-url` 指向真实网络）在本地模拟验证部署流程，不产生任何链上交易。
/// @dev `vm.startBroadcast()` 不传入任何私钥参数，使用 Foundry 默认测试签名者；
///      脚本不读取任何 `.env`/`.env.local`、不硬编码私钥或 RPC URL。
///      真实部署（含私钥/RPC）不在本 feature 范围内，需用户显式提供密钥后另行执行。
contract DeployTokenFaucet is Script {
    uint256 internal constant INITIAL_SUPPLY = 1_000_000e18;
    uint256 internal constant FAUCET_SEED = 100_000e18;

    function run() external {
        vm.startBroadcast();

        YDToken token = new YDToken(msg.sender, INITIAL_SUPPLY);
        YDFaucet faucet = new YDFaucet(address(token), msg.sender);
        token.transfer(address(faucet), FAUCET_SEED);

        vm.stopBroadcast();
    }
}
