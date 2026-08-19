// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {YDToken} from "../src/YDToken.sol";
import {Web3University} from "../src/Web3University.sol";
import {CourseCertificate} from "../src/CourseCertificate.sol";
import {DemoCompletionOracle} from "../src/DemoCompletionOracle.sol";

/// @title DemoCompletionOracle 测试
/// @dev 使用真实的 `Web3University`（而非 mock）验证转发行为——该合约体量小、已在
///      [[12.course-marketplace-contract]] 交付并测试过，用真实合约做集成测试比手写 mock
///      更能验证接口真实匹配。
contract DemoCompletionOracleTest is Test {
    YDToken internal token;
    Web3University internal market;
    CourseCertificate internal certificate;
    DemoCompletionOracle internal oracle;

    address internal owner = makeAddr("owner");
    address internal teacher = makeAddr("teacher");
    address internal student = makeAddr("student");
    address internal submitter = makeAddr("submitter");

    uint256 internal constant INITIAL_SUPPLY = 1_000_000e18;
    uint256 internal constant COURSE_PRICE = 10e18;
    string internal constant METADATA_URI = "ipfs://course-1";

    function setUp() public {
        token = new YDToken(owner, INITIAL_SUPPLY);
        market = new Web3University(address(token), owner);
        certificate = new CourseCertificate(owner);
        oracle = new DemoCompletionOracle(owner, address(market));

        vm.startPrank(owner);
        certificate.setMinter(address(market));
        market.setCertificate(address(certificate));
        market.setOracle(address(oracle));
        market.setTeacher(teacher, true);
        oracle.setTrustedSubmitter(submitter, true);
        vm.stopPrank();

        vm.prank(teacher);
        uint256 courseId = market.createCourse(COURSE_PRICE, METADATA_URI);

        vm.startPrank(owner);
        market.approveCourse(courseId);
        vm.stopPrank();

        vm.prank(teacher);
        market.setCourseActive(courseId, true);

        vm.prank(owner);
        token.transfer(student, COURSE_PRICE);

        vm.startPrank(student);
        token.approve(address(market), COURSE_PRICE);
        market.buyCourse(courseId);
        vm.stopPrank();
    }

    /* -------------------------------------------------------------------- */
    /*                          构造函数 / 零地址校验                        */
    /* -------------------------------------------------------------------- */

    function test_RevertWhen_OwnerIsZeroAddress() public {
        vm.expectRevert(DemoCompletionOracle.ZeroAddress.selector);
        new DemoCompletionOracle(address(0), address(market));
    }

    function test_RevertWhen_Web3UniversityIsZeroAddress() public {
        vm.expectRevert(DemoCompletionOracle.ZeroAddress.selector);
        new DemoCompletionOracle(owner, address(0));
    }

    /* -------------------------------------------------------------------- */
    /*                          受信任提交者白名单                           */
    /* -------------------------------------------------------------------- */

    function test_OwnerCanAddAndRemoveTrustedSubmitter() public {
        address newSubmitter = makeAddr("newSubmitter");

        vm.startPrank(owner);
        vm.expectEmit(true, false, false, true, address(oracle));
        emit DemoCompletionOracle.TrustedSubmitterUpdated(newSubmitter, true);
        oracle.setTrustedSubmitter(newSubmitter, true);
        assertTrue(oracle.isTrustedSubmitter(newSubmitter));

        oracle.setTrustedSubmitter(newSubmitter, false);
        assertFalse(oracle.isTrustedSubmitter(newSubmitter));
        vm.stopPrank();
    }

    function test_RevertWhen_SetTrustedSubmitterCalledByNonOwner() public {
        vm.prank(submitter);
        vm.expectRevert(DemoCompletionOracle.NotOwner.selector);
        oracle.setTrustedSubmitter(submitter, true);
    }

    /* -------------------------------------------------------------------- */
    /*                            confirmCompletion                          */
    /* -------------------------------------------------------------------- */

    function test_RevertWhen_ConfirmCompletionCalledByNonTrustedSubmitter() public {
        vm.prank(student);
        vm.expectRevert(DemoCompletionOracle.NotTrustedSubmitter.selector);
        oracle.confirmCompletion(student, 1);
    }

    function test_ConfirmCompletionForwardsToWeb3University() public {
        vm.prank(submitter);
        oracle.confirmCompletion(student, 1);

        assertTrue(market.completed(1, student));
        assertEq(certificate.ownerOf(1), student);
    }
}
