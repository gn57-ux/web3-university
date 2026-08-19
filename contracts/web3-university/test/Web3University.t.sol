// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {YDToken} from "../src/YDToken.sol";
import {Web3University} from "../src/Web3University.sol";
import {CourseCertificate} from "../src/CourseCertificate.sol";
import {DemoCompletionOracle} from "../src/DemoCompletionOracle.sol";

/// @title Web3University 测试
contract Web3UniversityTest is Test {
    YDToken internal token;
    Web3University internal market;

    address internal owner = makeAddr("owner");
    address internal teacher = makeAddr("teacher");
    address internal otherTeacher = makeAddr("otherTeacher");
    address internal student = makeAddr("student");

    uint256 internal constant INITIAL_SUPPLY = 1_000_000e18;
    uint256 internal constant COURSE_PRICE = 10e18;
    string internal constant METADATA_URI = "ipfs://course-1";

    function setUp() public {
        token = new YDToken(owner, INITIAL_SUPPLY);
        market = new Web3University(address(token), owner);

        vm.prank(owner);
        market.setTeacher(teacher, true);
    }

    /* -------------------------------------------------------------------- */
    /*                          构造函数 / 零地址校验                        */
    /* -------------------------------------------------------------------- */

    function test_RevertWhen_TokenIsZeroAddress() public {
        vm.expectRevert(Web3University.ZeroAddress.selector);
        new Web3University(address(0), owner);
    }

    function test_RevertWhen_OwnerIsZeroAddress() public {
        vm.expectRevert(Web3University.ZeroAddress.selector);
        new Web3University(address(token), address(0));
    }

    /* -------------------------------------------------------------------- */
    /*                              老师白名单                               */
    /* -------------------------------------------------------------------- */

    function test_SetTeacherSucceedsWhenCalledByOwner() public {
        vm.expectEmit(true, false, false, true, address(market));
        emit Web3University.TeacherUpdated(otherTeacher, true);

        vm.prank(owner);
        market.setTeacher(otherTeacher, true);

        assertTrue(market.isTeacher(otherTeacher));
    }

    function test_SetTeacherCanRevokeWhitelist() public {
        vm.prank(owner);
        market.setTeacher(teacher, false);

        assertFalse(market.isTeacher(teacher));
    }

    function test_RevertWhen_SetTeacherCalledByNonOwner() public {
        vm.prank(teacher);
        vm.expectRevert(Web3University.NotOwner.selector);
        market.setTeacher(otherTeacher, true);
    }

    function test_RevertWhen_CreateCourseCalledByNonWhitelistedTeacher() public {
        vm.prank(otherTeacher);
        vm.expectRevert(Web3University.NotWhitelistedTeacher.selector);
        market.createCourse(COURSE_PRICE, METADATA_URI);
    }

    /* -------------------------------------------------------------------- */
    /*                              课程创建                                 */
    /* -------------------------------------------------------------------- */

    function test_CreateCourseSucceeds() public {
        vm.expectEmit(true, true, false, true, address(market));
        emit Web3University.CourseCreated(1, teacher, COURSE_PRICE, METADATA_URI);

        vm.prank(teacher);
        uint256 courseId = market.createCourse(COURSE_PRICE, METADATA_URI);

        assertEq(courseId, 1);
        (address courseTeacher, uint256 price, string memory uri, bool approved, bool active) =
            market.courses(courseId);
        assertEq(courseTeacher, teacher);
        assertEq(price, COURSE_PRICE);
        assertEq(uri, METADATA_URI);
        assertFalse(approved);
        assertFalse(active);
    }

    function test_CreateCourseIncrementsCourseId() public {
        vm.startPrank(teacher);
        uint256 firstId = market.createCourse(COURSE_PRICE, METADATA_URI);
        uint256 secondId = market.createCourse(COURSE_PRICE, METADATA_URI);
        vm.stopPrank();

        assertEq(firstId, 1);
        assertEq(secondId, 2);
    }

    function test_RevertWhen_CreateCoursePriceIsZero() public {
        vm.prank(teacher);
        vm.expectRevert(Web3University.InvalidPrice.selector);
        market.createCourse(0, METADATA_URI);
    }

    /* -------------------------------------------------------------------- */
    /*                              课程审核                                 */
    /* -------------------------------------------------------------------- */

    function test_ApproveCourseSucceeds() public {
        uint256 courseId = _createCourse(teacher, COURSE_PRICE);

        vm.expectEmit(true, false, false, true, address(market));
        emit Web3University.CourseApproved(courseId);

        vm.prank(owner);
        market.approveCourse(courseId);

        (,,, bool approved,) = market.courses(courseId);
        assertTrue(approved);
    }

    function test_RevertWhen_ApproveCourseCalledByNonOwner() public {
        uint256 courseId = _createCourse(teacher, COURSE_PRICE);

        vm.prank(teacher);
        vm.expectRevert(Web3University.NotOwner.selector);
        market.approveCourse(courseId);
    }

    function test_RevertWhen_ApproveCourseNotFound() public {
        vm.prank(owner);
        vm.expectRevert(Web3University.CourseNotFound.selector);
        market.approveCourse(999);
    }

    function test_RevertWhen_ApproveCourseAlreadyApproved() public {
        uint256 courseId = _createCourse(teacher, COURSE_PRICE);

        vm.startPrank(owner);
        market.approveCourse(courseId);

        vm.expectRevert(Web3University.CourseAlreadyApproved.selector);
        market.approveCourse(courseId);
        vm.stopPrank();
    }

    /* -------------------------------------------------------------------- */
    /*                              课程上下架                               */
    /* -------------------------------------------------------------------- */

    function test_SetCourseActiveSucceedsAfterApproval() public {
        uint256 courseId = _createApprovedCourse(teacher, COURSE_PRICE);

        vm.expectEmit(true, false, false, true, address(market));
        emit Web3University.CourseStatusChanged(courseId, true);

        vm.prank(teacher);
        market.setCourseActive(courseId, true);

        (,,,, bool active) = market.courses(courseId);
        assertTrue(active);
    }

    function test_SetCourseActiveCanDeactivateWithoutPrecondition() public {
        uint256 courseId = _createApprovedCourse(teacher, COURSE_PRICE);

        vm.startPrank(teacher);
        market.setCourseActive(courseId, true);
        market.setCourseActive(courseId, false);
        vm.stopPrank();

        (,,,, bool active) = market.courses(courseId);
        assertFalse(active);
    }

    function test_RevertWhen_SetCourseActiveBeforeApproval() public {
        uint256 courseId = _createCourse(teacher, COURSE_PRICE);

        vm.prank(teacher);
        vm.expectRevert(Web3University.CourseNotApproved.selector);
        market.setCourseActive(courseId, true);
    }

    function test_RevertWhen_SetCourseActiveCalledByOtherTeacher() public {
        uint256 courseId = _createApprovedCourse(teacher, COURSE_PRICE);

        vm.prank(owner);
        market.setTeacher(otherTeacher, true);

        vm.prank(otherTeacher);
        vm.expectRevert(Web3University.NotCourseTeacher.selector);
        market.setCourseActive(courseId, true);
    }

    /// @notice Owner 本身也不是任何课程的 teacher（除非自己也被加入白名单并创建课程），
    ///         尝试上下架不属于自己的课程必须 revert（tasks.md 风险点显式要求覆盖）。
    function test_RevertWhen_SetCourseActiveCalledByOwnerWhoIsNotTeacher() public {
        uint256 courseId = _createApprovedCourse(teacher, COURSE_PRICE);

        vm.prank(owner);
        vm.expectRevert(Web3University.NotCourseTeacher.selector);
        market.setCourseActive(courseId, true);
    }

    function test_RevertWhen_SetCourseActiveCourseNotFound() public {
        vm.prank(teacher);
        vm.expectRevert(Web3University.CourseNotFound.selector);
        market.setCourseActive(999, true);
    }

    /* -------------------------------------------------------------------- */
    /*                              课程购买                                 */
    /* -------------------------------------------------------------------- */

    function test_BuyCourseSucceeds() public {
        uint256 courseId = _createActiveCourse(teacher, COURSE_PRICE);
        _fundStudent(student, COURSE_PRICE);

        uint256 teacherBalanceBefore = token.balanceOf(teacher);

        vm.startPrank(student);
        token.approve(address(market), COURSE_PRICE);

        vm.expectEmit(true, true, false, true, address(market));
        emit Web3University.CoursePurchased(student, courseId, COURSE_PRICE, block.timestamp);

        market.buyCourse(courseId);
        vm.stopPrank();

        assertEq(token.balanceOf(student), 0);
        assertEq(token.balanceOf(teacher), teacherBalanceBefore + COURSE_PRICE);
        assertTrue(market.hasPurchased(courseId, student));

        (
            address purchaseStudent,
            uint256 purchaseCourseId,
            uint256 pricePaid,
            uint256 purchasedAt
        ) = market.purchaseOf(courseId, student);
        assertEq(purchaseStudent, student);
        assertEq(purchaseCourseId, courseId);
        assertEq(pricePaid, COURSE_PRICE);
        assertEq(purchasedAt, block.timestamp);
    }

    function test_RevertWhen_BuyCourseInsufficientBalance() public {
        uint256 courseId = _createActiveCourse(teacher, COURSE_PRICE);
        // student 未持有任何 YD，approve 足额但余额为 0
        vm.startPrank(student);
        token.approve(address(market), COURSE_PRICE);

        vm.expectRevert();
        market.buyCourse(courseId);
        vm.stopPrank();
    }

    function test_RevertWhen_BuyCourseInsufficientAllowance() public {
        uint256 courseId = _createActiveCourse(teacher, COURSE_PRICE);
        _fundStudent(student, COURSE_PRICE);

        // 未 approve，直接购买
        vm.prank(student);
        vm.expectRevert();
        market.buyCourse(courseId);
    }

    function test_RevertWhen_BuyCourseNotApproved() public {
        uint256 courseId = _createCourse(teacher, COURSE_PRICE);
        _fundStudent(student, COURSE_PRICE);

        vm.startPrank(student);
        token.approve(address(market), COURSE_PRICE);

        vm.expectRevert(Web3University.CourseNotAvailable.selector);
        market.buyCourse(courseId);
        vm.stopPrank();
    }

    function test_RevertWhen_BuyCourseNotActive() public {
        uint256 courseId = _createApprovedCourse(teacher, COURSE_PRICE);
        _fundStudent(student, COURSE_PRICE);

        vm.startPrank(student);
        token.approve(address(market), COURSE_PRICE);

        vm.expectRevert(Web3University.CourseNotAvailable.selector);
        market.buyCourse(courseId);
        vm.stopPrank();
    }

    function test_RevertWhen_BuyCourseNotFound() public {
        vm.prank(student);
        vm.expectRevert(Web3University.CourseNotFound.selector);
        market.buyCourse(999);
    }

    function test_RevertWhen_BuyCourseTwice() public {
        uint256 courseId = _createActiveCourse(teacher, COURSE_PRICE);
        _fundStudent(student, COURSE_PRICE * 2);

        vm.startPrank(student);
        token.approve(address(market), COURSE_PRICE * 2);
        market.buyCourse(courseId);

        uint256 studentBalanceAfterFirstBuy = token.balanceOf(student);
        uint256 teacherBalanceAfterFirstBuy = token.balanceOf(teacher);

        vm.expectRevert(Web3University.AlreadyPurchased.selector);
        market.buyCourse(courseId);
        vm.stopPrank();

        // 二次调用必须不产生任何额外状态变化或代币转移
        assertEq(token.balanceOf(student), studentBalanceAfterFirstBuy);
        assertEq(token.balanceOf(teacher), teacherBalanceAfterFirstBuy);
    }

    /// @notice F-005 核心风险点：两门不同价格的课程各自结算正确的价格，
    ///         证明 buyCourse 的价格确实来自各自课程的链上配置，而非硬编码常量。
    function test_BuyCoursePriceMatchesEachCourseConfiguredPrice() public {
        uint256 cheapPrice = 3e18;
        uint256 expensivePrice = 77e18;

        uint256 cheapCourseId = _createActiveCourse(teacher, cheapPrice);

        vm.prank(owner);
        market.setTeacher(otherTeacher, true);
        uint256 expensiveCourseId = _createActiveCourse(otherTeacher, expensivePrice);

        _fundStudent(student, cheapPrice + expensivePrice);

        uint256 teacherBalanceBefore = token.balanceOf(teacher);
        uint256 otherTeacherBalanceBefore = token.balanceOf(otherTeacher);

        vm.startPrank(student);
        token.approve(address(market), cheapPrice + expensivePrice);

        market.buyCourse(cheapCourseId);
        market.buyCourse(expensiveCourseId);
        vm.stopPrank();

        (,, uint256 cheapPricePaid,) = market.purchaseOf(cheapCourseId, student);
        (,, uint256 expensivePricePaid,) = market.purchaseOf(expensiveCourseId, student);

        assertEq(cheapPricePaid, cheapPrice);
        assertEq(expensivePricePaid, expensivePrice);
        assertEq(token.balanceOf(teacher), teacherBalanceBefore + cheapPrice);
        assertEq(token.balanceOf(otherTeacher), otherTeacherBalanceBefore + expensivePrice);
        assertEq(token.balanceOf(student), 0);
    }

    /* -------------------------------------------------------------------- */
    /*                        完课确认 + 证书铸造（集成）                    */
    /* -------------------------------------------------------------------- */

    CourseCertificate internal certificate;
    DemoCompletionOracle internal oracle;
    address internal submitter = makeAddr("submitter");

    /// @dev 部署并接线 CourseCertificate + DemoCompletionOracle，按 design.md「先部署、
    ///      后接线」顺序：CourseCertificate（无 minter）-> Web3University（已在 setUp
    ///      部署）-> DemoCompletionOracle（传入 Web3University 地址）-> Owner 依次调用
    ///      setMinter/setCertificate/setOracle。
    function _wireCompletionContracts() internal {
        certificate = new CourseCertificate(owner);
        oracle = new DemoCompletionOracle(owner, address(market));

        vm.startPrank(owner);
        certificate.setMinter(address(market));
        market.setCertificate(address(certificate));
        market.setOracle(address(oracle));
        oracle.setTrustedSubmitter(submitter, true);
        vm.stopPrank();
    }

    function test_SetOracleSucceedsWhenCalledByOwner() public {
        address newOracle = makeAddr("newOracle");

        vm.expectEmit(true, false, false, true, address(market));
        emit Web3University.OracleUpdated(newOracle);

        vm.prank(owner);
        market.setOracle(newOracle);

        assertEq(market.oracle(), newOracle);
    }

    function test_RevertWhen_SetOracleCalledByNonOwner() public {
        vm.prank(teacher);
        vm.expectRevert(Web3University.NotOwner.selector);
        market.setOracle(teacher);
    }

    function test_SetCertificateSucceedsWhenCalledByOwner() public {
        address newCertificate = makeAddr("newCertificate");

        vm.expectEmit(true, false, false, true, address(market));
        emit Web3University.CertificateContractUpdated(newCertificate);

        vm.prank(owner);
        market.setCertificate(newCertificate);

        assertEq(market.certificate(), newCertificate);
    }

    function test_RevertWhen_SetCertificateCalledByNonOwner() public {
        vm.prank(teacher);
        vm.expectRevert(Web3University.NotOwner.selector);
        market.setCertificate(teacher);
    }

    function test_RevertWhen_MarkCompletedCalledByNonOracle() public {
        _wireCompletionContracts();
        uint256 courseId = _createActiveCourse(teacher, COURSE_PRICE);
        _fundStudent(student, COURSE_PRICE);

        vm.startPrank(student);
        token.approve(address(market), COURSE_PRICE);
        market.buyCourse(courseId);
        vm.stopPrank();

        // 绕过 oracle，非 oracle 地址直接调用 markCompleted 必须 revert
        vm.prank(student);
        vm.expectRevert(Web3University.NotOracle.selector);
        market.markCompleted(student, courseId);
    }

    /// @notice 完整链路集成测试：受信任提交者 -> DemoCompletionOracle.confirmCompletion
    ///         -> Web3University.markCompleted -> CourseCertificate.mint，断言
    ///         tokenId/owner/tokenURI/completed 状态以及全部三个事件均正确触发。
    function test_FullCompletionLifecycleMintsCertificate() public {
        _wireCompletionContracts();
        uint256 courseId = _createActiveCourse(teacher, COURSE_PRICE);
        _fundStudent(student, COURSE_PRICE);

        vm.startPrank(student);
        token.approve(address(market), COURSE_PRICE);
        market.buyCourse(courseId);
        vm.stopPrank();

        vm.expectEmit(true, true, false, true, address(market));
        emit Web3University.CourseCompleted(student, courseId, block.timestamp);
        vm.expectEmit(true, true, true, true, address(certificate));
        emit CourseCertificate.CertificateMinted(student, courseId, 1);

        vm.prank(submitter);
        oracle.confirmCompletion(student, courseId);

        assertTrue(market.completed(courseId, student));
        assertEq(certificate.ownerOf(1), student);
        assertEq(certificate.tokenURI(1), METADATA_URI);
        assertTrue(certificate.hasCertificate(courseId, student));
    }

    function test_RevertWhen_MarkCompletedStudentNeverPurchased() public {
        _wireCompletionContracts();
        uint256 courseId = _createActiveCourse(teacher, COURSE_PRICE);

        // student 从未购买该课程
        vm.prank(submitter);
        vm.expectRevert(Web3University.CourseNotPurchased.selector);
        oracle.confirmCompletion(student, courseId);
    }

    function test_RevertWhen_MarkCompletedTwice() public {
        _wireCompletionContracts();
        uint256 courseId = _createActiveCourse(teacher, COURSE_PRICE);
        _fundStudent(student, COURSE_PRICE);

        vm.startPrank(student);
        token.approve(address(market), COURSE_PRICE);
        market.buyCourse(courseId);
        vm.stopPrank();

        vm.prank(submitter);
        oracle.confirmCompletion(student, courseId);

        vm.prank(submitter);
        vm.expectRevert(Web3University.CourseAlreadyCompleted.selector);
        oracle.confirmCompletion(student, courseId);
    }

    function test_RevertWhen_MarkCompletedCourseNotFound() public {
        _wireCompletionContracts();

        vm.prank(owner);
        market.setOracle(owner);

        vm.prank(owner);
        vm.expectRevert(Web3University.CourseNotFound.selector);
        market.markCompleted(student, 999);
    }

    /// @notice 风险点：证书合约铸造 revert 时，`completed` 状态必须一并回滚，不能出现
    ///         "标记完成但没有证书"的不一致态。通过让 minter（market）预先直接铸造一枚
    ///         证书（绕过正常的 markCompleted 流程，模拟 CourseCertificate 自身状态已
    ///         存在的边缘情况）触发 `certificate.mint` 内部的 CertificateAlreadyMinted，
    ///         验证 markCompleted 整笔交易连同 `completed` 写入一起回滚。
    function test_RevertWhen_CertificateMintFailsCompletedStateRollsBack() public {
        _wireCompletionContracts();
        uint256 courseId = _createActiveCourse(teacher, COURSE_PRICE);
        _fundStudent(student, COURSE_PRICE);

        vm.startPrank(student);
        token.approve(address(market), COURSE_PRICE);
        market.buyCourse(courseId);
        vm.stopPrank();

        // 模拟证书已存在（正常流程不可达，仅用于验证纵深防御回滚行为）
        vm.prank(address(market));
        certificate.mint(student, courseId, METADATA_URI);

        vm.prank(submitter);
        vm.expectRevert(CourseCertificate.CertificateAlreadyMinted.selector);
        oracle.confirmCompletion(student, courseId);

        assertFalse(market.completed(courseId, student));
    }

    /* -------------------------------------------------------------------- */
    /*                                helpers                                */
    /* -------------------------------------------------------------------- */

    function _createCourse(address courseTeacher, uint256 price)
        internal
        returns (uint256 courseId)
    {
        vm.prank(courseTeacher);
        courseId = market.createCourse(price, METADATA_URI);
    }

    function _createApprovedCourse(address courseTeacher, uint256 price)
        internal
        returns (uint256 courseId)
    {
        courseId = _createCourse(courseTeacher, price);
        vm.prank(owner);
        market.approveCourse(courseId);
    }

    function _createActiveCourse(address courseTeacher, uint256 price)
        internal
        returns (uint256 courseId)
    {
        courseId = _createApprovedCourse(courseTeacher, price);
        vm.prank(courseTeacher);
        market.setCourseActive(courseId, true);
    }

    function _fundStudent(address recipient, uint256 amount) internal {
        vm.prank(owner);
        token.transfer(recipient, amount);
    }
}
