// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {YDToken} from "../src/YDToken.sol";
import {YDFaucet} from "../src/YDFaucet.sol";

/// @title YDFaucet 测试
contract YDFaucetTest is Test {
    YDToken internal token;
    YDFaucet internal faucet;

    address internal owner = makeAddr("owner");
    uint256 internal constant INITIAL_SUPPLY = 1_000_000e18;
    uint256 internal constant FAUCET_SEED = 100e18;

    function setUp() public {
        // owner 持有全部初始供应量，再通过普通 transfer 注入一部分到 Faucet
        token = new YDToken(owner, INITIAL_SUPPLY);
        faucet = new YDFaucet(address(token), owner);

        vm.prank(owner);
        token.transfer(address(faucet), FAUCET_SEED);
    }

    function test_ClaimSucceedsOnFirstCall() public {
        address student = makeAddr("student");

        vm.expectEmit(true, false, false, true, address(faucet));
        emit YDFaucet.TokensClaimed(student, faucet.CLAIM_AMOUNT());

        vm.prank(student);
        faucet.claim();

        assertEq(token.balanceOf(student), faucet.CLAIM_AMOUNT());
        assertTrue(faucet.hasClaimed(student));
        assertEq(token.balanceOf(address(faucet)), FAUCET_SEED - faucet.CLAIM_AMOUNT());
    }

    function test_RevertWhen_ClaimCalledTwice() public {
        address student = makeAddr("student");

        vm.startPrank(student);
        faucet.claim();

        vm.expectRevert(YDFaucet.AlreadyClaimed.selector);
        faucet.claim();
        vm.stopPrank();
    }

    function test_RevertWhen_FaucetBalanceInsufficient() public {
        // 部署一个没有注资的 Faucet，余额为 0 < CLAIM_AMOUNT
        YDFaucet emptyFaucet = new YDFaucet(address(token), owner);
        address student = makeAddr("student");

        vm.prank(student);
        vm.expectRevert(YDFaucet.InsufficientFaucetBalance.selector);
        emptyFaucet.claim();
    }

    function test_RevertWhen_FundCalledByNonOwner() public {
        address stranger = makeAddr("stranger");

        vm.prank(stranger);
        vm.expectRevert(YDFaucet.NotOwner.selector);
        faucet.fund(10e18);
    }

    function test_FundSucceedsWhenCalledByOwner() public {
        uint256 fundAmount = 200e18;

        vm.startPrank(owner);
        token.approve(address(faucet), fundAmount);

        vm.expectEmit(true, false, false, true, address(faucet));
        emit YDFaucet.FaucetFunded(owner, fundAmount);

        faucet.fund(fundAmount);
        vm.stopPrank();

        assertEq(token.balanceOf(address(faucet)), FAUCET_SEED + fundAmount);
    }

    function test_RevertWhen_OwnerIsZeroAddress() public {
        vm.expectRevert(YDFaucet.ZeroAddress.selector);
        new YDFaucet(address(token), address(0));
    }

    function test_RevertWhen_TokenIsZeroAddress() public {
        vm.expectRevert(YDFaucet.ZeroAddress.selector);
        new YDFaucet(address(0), owner);
    }

    /// @notice Fuzz：对任意非零、非本合约/预置地址，claim() 的"只能领取一次"不变量恒成立
    function testFuzz_ClaimUniquenessPerAddress(address student) public {
        vm.assume(student != address(0));
        vm.assume(student != address(faucet));
        vm.assume(student != owner);

        vm.startPrank(student);
        faucet.claim();
        assertTrue(faucet.hasClaimed(student));
        assertEq(token.balanceOf(student), faucet.CLAIM_AMOUNT());

        vm.expectRevert(YDFaucet.AlreadyClaimed.selector);
        faucet.claim();
        vm.stopPrank();
    }
}
