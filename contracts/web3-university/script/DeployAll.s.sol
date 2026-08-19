// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {YDToken} from "../src/YDToken.sol";
import {YDFaucet} from "../src/YDFaucet.sol";
import {Web3University} from "../src/Web3University.sol";
import {CourseCertificate} from "../src/CourseCertificate.sol";
import {DemoCompletionOracle} from "../src/DemoCompletionOracle.sol";

/// @title 本地部署脚本：完整合约闭环（YDToken + YDFaucet + Web3University +
///        CourseCertificate + DemoCompletionOracle）
/// @notice 仅用于 `forge script script/DeployAll.s.sol`（不带 `--broadcast`、不带
///         `--rpc-url` 指向真实网络）在本地模拟验证部署流程，不产生任何链上交易。部署完成
///         后额外跑通一次完整的「创建课程 -> 审核 -> 上架 -> 购买 -> 确认完成 -> 铸造证书」
///         流程，证明 [[13.course-certificate-completion]] 收尾后 PRD 第 15 节「里程碑一：
///         合约闭环」全链路没有断点。
/// @dev `vm.startBroadcast()` 不传入任何私钥参数，使用 Foundry 默认测试签名者；
///      脚本不读取任何 `.env`/`.env.local`、不硬编码私钥或 RPC URL。真实部署（含私钥/RPC）
///      不在本 feature 范围内，需用户显式提供密钥后另行执行。按 design.md「部署与接线
///      顺序」：先部署 CourseCertificate（无 minter）-> Web3University（构造函数不变）->
///      DemoCompletionOracle（传入 Web3University 地址），再由 Owner 依次调用
///      setMinter/setCertificate/setOracle 完成接线，解决三者部署时的循环依赖。
contract DeployAll is Script {
    uint256 internal constant INITIAL_SUPPLY = 1_000_000e18;
    uint256 internal constant FAUCET_SEED = 100_000e18;
    uint256 internal constant COURSE_PRICE = 10e18;
    string internal constant METADATA_URI = "ipfs://demo-course";

    function run() external {
        // 演示流程里的 owner/老师/学生/演示提交者地址均由固定测试私钥派生，全程显式指定
        // 每一次 broadcast 的私钥（不依赖隐式的无参 `vm.startBroadcast()` 默认发送者），
        // 避免在多次切换广播身份后 dry-run 模拟对"默认发送者是谁"产生歧义。
        uint256 ownerKey = uint256(keccak256("deploy-all-owner"));
        uint256 teacherKey = uint256(keccak256("deploy-all-teacher"));
        uint256 studentKey = uint256(keccak256("deploy-all-student"));
        uint256 submitterKey = uint256(keccak256("deploy-all-submitter"));
        address owner_ = vm.addr(ownerKey);
        address teacher = vm.addr(teacherKey);
        address student = vm.addr(studentKey);
        address submitter = vm.addr(submitterKey);

        vm.startBroadcast(ownerKey);

        // 1. 部署基础资产层
        YDToken token = new YDToken(owner_, INITIAL_SUPPLY);
        YDFaucet faucet = new YDFaucet(address(token), owner_);
        token.transfer(address(faucet), FAUCET_SEED);

        // 2. 先部署、后接线：CourseCertificate（无 minter）-> Web3University ->
        //    DemoCompletionOracle
        CourseCertificate certificate = new CourseCertificate(owner_);
        Web3University market = new Web3University(address(token), owner_);
        DemoCompletionOracle oracle = new DemoCompletionOracle(owner_, address(market));

        certificate.setMinter(address(market));
        market.setCertificate(address(certificate));
        market.setOracle(address(oracle));

        // 3. 白名单老师、受信任提交者
        market.setTeacher(teacher, true);
        oracle.setTrustedSubmitter(submitter, true);

        // 4. 给学生分发用于购买课程的 YD（直接转账，模拟已通过 Faucet 领取）
        token.transfer(student, COURSE_PRICE);

        vm.stopBroadcast();

        // 5. 创建课程 -> 审核 -> 上架（分别以老师/Owner 身份广播）
        vm.startBroadcast(teacherKey);
        uint256 courseId = market.createCourse(COURSE_PRICE, METADATA_URI);
        vm.stopBroadcast();

        vm.startBroadcast(ownerKey);
        market.approveCourse(courseId);
        vm.stopBroadcast();

        vm.startBroadcast(teacherKey);
        market.setCourseActive(courseId, true);
        vm.stopBroadcast();

        // 6. 学生购买课程
        vm.startBroadcast(studentKey);
        token.approve(address(market), COURSE_PRICE);
        market.buyCourse(courseId);
        vm.stopBroadcast();

        // 7. 受信任提交者确认完课 -> Web3University.markCompleted -> 铸造证书
        vm.startBroadcast(submitterKey);
        oracle.confirmCompletion(student, courseId);
        vm.stopBroadcast();

        console.log("courseId:", courseId);
        console.log("student completed:", market.completed(courseId, student));
        console.log("certificate tokenId 1 owner:", certificate.ownerOf(1));
        console.log("certificate tokenURI:", certificate.tokenURI(1));
    }
}
