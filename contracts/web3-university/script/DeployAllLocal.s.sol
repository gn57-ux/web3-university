// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {YDToken} from "../src/YDToken.sol";
import {YDFaucet} from "../src/YDFaucet.sol";
import {Web3University} from "../src/Web3University.sol";
import {CourseCertificate} from "../src/CourseCertificate.sol";
import {DemoCompletionOracle} from "../src/DemoCompletionOracle.sol";

/// @title 本地 Anvil 广播部署脚本：完整合约闭环 + 前端联调种子数据
/// @notice 与 `DeployAll.s.sol`（纯本地 dry-run 模拟，不广播）不同，本脚本用
///         `--broadcast --rpc-url http://127.0.0.1:8545` 真实广播到本地 Anvil 链，
///         让部署结果持久化，供前端 [[14.contract-client-foundation]] 的
///         `publicClient`/`walletClient` 读写。**推荐唯一入口是
///         `npm run contracts:deploy-local`**（`script/deploy-local.sh`，`--rpc-url`
///         硬编码为 `127.0.0.1`，不接受调用方覆盖）——直接手工敲 `forge script`
///         命令时，务必自己保证 `--rpc-url` 只指向本地 Anvil：`run()` 开头的
///         `block.chainid == 31337` 校验只能拦住"链 ID 不对"，拦不住一个谎报自己
///         是 31337 的恶意/配置错误的远程节点，真正的边界必须在调用这一层（也就是
///         `deploy-local.sh`）保证。脚本内硬编码的私钥全部是 Anvil 启动时打印的
///         默认测试账户（公开已知、零真实价值，绝不能用于任何真实网络）。
///         Anvil 必须以 `--gas-price 0 --block-base-fee-per-gas 0
///         --disable-min-priority-fee` 启动（`deploy-local.sh` 会在广播前校验
///         `eth_gasPrice` 确实为 0，否则直接拒绝并提示正确的启动参数）：Privy
///         登录时动态创建的学生嵌入式钱包地址没有任何预充值 ETH，本地演示场景不
///         做 ETH gas 赞助/水龙头这类额外基础设施，直接把本地链的 gas 成本清零，
///         零余额地址也能正常发起 `claim`/`approve`/`buyCourse` 交易。仅这三个
///         启动参数还不够——Anvil 的 `eth_maxPriorityFeePerGas` 固定建议 1 gwei，
///         不受这些参数影响，前端必须在每次 `writeContract` 调用时显式传入零费用
///         参数（见 `lib/contracts/useContractClients.ts` 的 `withZeroFeeDefaults`，
///         已用真实交易验证）。真实网络部署时用户需要真实 ETH 支付 gas，这是后续
///         里程碑要解决的问题，不在本 feature 范围内。
/// @dev 账户角色分配（均为 Anvil 默认账户 0/1/2）：
///      - Owner/部署者：账户 0（0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266）
///      - 老师：账户 1（0x70997970C51812dc3A010C7d01b50e0d17dc79C8）
///      - 完课确认受信任提交者：账户 2（0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC，
///        对应 [[16.onchain-completion-certificate]] 服务端 `TRUSTED_SUBMITTER_PRIVATE_KEY`）
///      不预先购买/完成任何课程——真实学生账户是浏览器里 Privy 嵌入式钱包动态创建的
///      地址，部署时无法预知，购买/完成流程完全交给前端联调触发。
///      课程按 `lib/mock/fixtures.ts` 的 `mockCourses` 数组顺序创建，courseId 1/2/3
///      依次对应 `solidity-101`/`web3-dapp-from-zero`/`defi-uniswap-practical`，与
///      [[15.onchain-token-course-purchase]] 的 `lib/contracts/courseIdMap.ts` 保持一致。
contract DeployAllLocal is Script {
    // Anvil 默认测试账户私钥（公开已知，仅用于本地链，禁止用于任何真实网络）
    uint256 internal constant OWNER_KEY =
        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 internal constant TEACHER_KEY =
        0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
    uint256 internal constant SUBMITTER_KEY =
        0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a;

    uint256 internal constant INITIAL_SUPPLY = 1_000_000e18;
    uint256 internal constant FAUCET_SEED = 500_000e18;

    function run() external {
        // 硬编码的是 Anvil 公开已知的默认测试私钥，一旦被误传其他网络的 --rpc-url，
        // 这些私钥控制的资产会暴露；在广播前强制校验目标链就是本地 Anvil（chainId
        // 31337），传入任何其他链都直接 revert，不给"注释警告"以外的第二道防线
        // 留空（Codex Review 抓到的 P2）。
        require(block.chainid == 31337, "DeployAllLocal: only local Anvil (chainId 31337) allowed");

        address owner_ = vm.addr(OWNER_KEY);
        address teacher = vm.addr(TEACHER_KEY);
        address submitter = vm.addr(SUBMITTER_KEY);

        vm.startBroadcast(OWNER_KEY);

        YDToken token = new YDToken(owner_, INITIAL_SUPPLY);
        YDFaucet faucet = new YDFaucet(address(token), owner_);
        token.approve(address(faucet), FAUCET_SEED);
        faucet.fund(FAUCET_SEED);

        CourseCertificate certificate = new CourseCertificate(owner_);
        Web3University market = new Web3University(address(token), owner_);
        DemoCompletionOracle oracle = new DemoCompletionOracle(owner_, address(market));

        certificate.setMinter(address(market));
        market.setCertificate(address(certificate));
        market.setOracle(address(oracle));

        market.setTeacher(teacher, true);
        oracle.setTrustedSubmitter(submitter, true);

        vm.stopBroadcast();

        // 按 mockCourses 顺序创建三门种子课程，courseId 1/2/3 固定对应下列 slug
        _seedCourse(market, 4e18, "solidity-101");
        _seedCourse(market, 8e18, "web3-dapp-from-zero");
        _seedCourse(market, 8e18, "defi-uniswap-practical");

        console.log("YDToken:", address(token));
        console.log("YDFaucet:", address(faucet));
        console.log("Web3University:", address(market));
        console.log("CourseCertificate:", address(certificate));
        console.log("DemoCompletionOracle:", address(oracle));
        console.log("owner:", owner_);
        console.log("teacher:", teacher);
        console.log("trustedSubmitter:", submitter);
    }

    function _seedCourse(Web3University market, uint256 price, string memory slug) internal {
        vm.startBroadcast(TEACHER_KEY);
        uint256 courseId = market.createCourse(price, slug);
        vm.stopBroadcast();

        vm.startBroadcast(OWNER_KEY);
        market.approveCourse(courseId);
        vm.stopBroadcast();

        vm.startBroadcast(TEACHER_KEY);
        market.setCourseActive(courseId, true);
        vm.stopBroadcast();

        console.log(string.concat("seeded course #", vm.toString(courseId), ": ", slug));
    }
}
