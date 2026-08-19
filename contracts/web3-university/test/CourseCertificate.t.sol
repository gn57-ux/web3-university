// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {CourseCertificate} from "../src/CourseCertificate.sol";

/// @title CourseCertificate 测试
contract CourseCertificateTest is Test {
    CourseCertificate internal certificate;

    address internal owner = makeAddr("owner");
    address internal minter = makeAddr("minter");
    address internal student = makeAddr("student");
    address internal otherStudent = makeAddr("otherStudent");

    uint256 internal constant COURSE_ID = 1;
    string internal constant TOKEN_URI = "ipfs://course-1";

    function setUp() public {
        certificate = new CourseCertificate(owner);

        vm.prank(owner);
        certificate.setMinter(minter);
    }

    /* -------------------------------------------------------------------- */
    /*                          构造函数 / 零地址校验                        */
    /* -------------------------------------------------------------------- */

    function test_RevertWhen_OwnerIsZeroAddress() public {
        vm.expectRevert(CourseCertificate.ZeroAddress.selector);
        new CourseCertificate(address(0));
    }

    /* -------------------------------------------------------------------- */
    /*                                setMinter                             */
    /* -------------------------------------------------------------------- */

    function test_SetMinterSucceedsWhenCalledByOwner() public {
        address newMinter = makeAddr("newMinter");

        vm.expectEmit(true, false, false, true, address(certificate));
        emit CourseCertificate.MinterUpdated(newMinter);

        vm.prank(owner);
        certificate.setMinter(newMinter);

        assertEq(certificate.minter(), newMinter);
    }

    function test_RevertWhen_SetMinterCalledByNonOwner() public {
        vm.prank(minter);
        vm.expectRevert(CourseCertificate.NotOwner.selector);
        certificate.setMinter(minter);
    }

    /* -------------------------------------------------------------------- */
    /*                                  mint                                 */
    /* -------------------------------------------------------------------- */

    function test_RevertWhen_MintCalledByNonMinter() public {
        vm.prank(student);
        vm.expectRevert(CourseCertificate.NotMinter.selector);
        certificate.mint(student, COURSE_ID, TOKEN_URI);
    }

    function test_MintSucceeds() public {
        vm.expectEmit(true, true, true, true, address(certificate));
        emit CourseCertificate.CertificateMinted(student, COURSE_ID, 1);

        vm.prank(minter);
        uint256 tokenId = certificate.mint(student, COURSE_ID, TOKEN_URI);

        assertEq(tokenId, 1);
        assertEq(certificate.ownerOf(tokenId), student);
        assertEq(certificate.tokenURI(tokenId), TOKEN_URI);
        assertTrue(certificate.hasCertificate(COURSE_ID, student));

        (uint256 dataCourseId, address dataStudent, uint256 completedAt) =
            certificate.certificateData(tokenId);
        assertEq(dataCourseId, COURSE_ID);
        assertEq(dataStudent, student);
        assertEq(completedAt, block.timestamp);
    }

    function test_RevertWhen_MintDuplicateForSameCourseAndStudent() public {
        vm.startPrank(minter);
        certificate.mint(student, COURSE_ID, TOKEN_URI);

        vm.expectRevert(CourseCertificate.CertificateAlreadyMinted.selector);
        certificate.mint(student, COURSE_ID, TOKEN_URI);
        vm.stopPrank();
    }

    function test_TwoDifferentStudentsCanEachGetCertificateForSameCourse() public {
        vm.startPrank(minter);
        uint256 firstTokenId = certificate.mint(student, COURSE_ID, TOKEN_URI);
        uint256 secondTokenId = certificate.mint(otherStudent, COURSE_ID, TOKEN_URI);
        vm.stopPrank();

        assertEq(certificate.ownerOf(firstTokenId), student);
        assertEq(certificate.ownerOf(secondTokenId), otherStudent);
        assertTrue(certificate.hasCertificate(COURSE_ID, student));
        assertTrue(certificate.hasCertificate(COURSE_ID, otherStudent));
    }
}
