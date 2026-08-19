// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {YDToken} from "../src/YDToken.sol";

/// @title YDToken 测试
/// @dev 只做集成验证（初始铸造、元数据、标准转账/授权行为触达），
///      不重新测试 OpenZeppelin ERC20 内部实现。
contract YDTokenTest is Test {
    YDToken internal token;

    address internal initialHolder = makeAddr("initialHolder");
    uint256 internal constant INITIAL_SUPPLY = 1_000_000e18;

    function setUp() public {
        token = new YDToken(initialHolder, INITIAL_SUPPLY);
    }

    function test_MetadataMatchesSpec() public view {
        assertEq(token.name(), "YD Token");
        assertEq(token.symbol(), "YD");
        assertEq(token.decimals(), 18);
    }

    function test_InitialSupplyMintedToHolder() public view {
        assertEq(token.balanceOf(initialHolder), INITIAL_SUPPLY);
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
    }

    function test_Transfer() public {
        address recipient = makeAddr("recipient");

        vm.prank(initialHolder);
        bool success = token.transfer(recipient, 100e18);

        assertTrue(success);
        assertEq(token.balanceOf(recipient), 100e18);
        assertEq(token.balanceOf(initialHolder), INITIAL_SUPPLY - 100e18);
    }

    function test_ApproveAndTransferFrom() public {
        address spender = makeAddr("spender");
        address recipient = makeAddr("recipient");

        vm.prank(initialHolder);
        token.approve(spender, 50e18);
        assertEq(token.allowance(initialHolder, spender), 50e18);

        vm.prank(spender);
        bool success = token.transferFrom(initialHolder, recipient, 50e18);

        assertTrue(success);
        assertEq(token.balanceOf(recipient), 50e18);
        assertEq(token.allowance(initialHolder, spender), 0);
    }
}
