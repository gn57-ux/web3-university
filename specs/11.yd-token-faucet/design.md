# yd-token-faucet — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-19 | v1 | 初始设计 |

## 项目架构

- 架构类型: 单体仓库，新增独立 Foundry 子工程
- 涉及层: 智能合约（Solidity + Foundry + OpenZeppelin）

## 架构决策：单体合约 vs 分离合约（本决策对 11/12/13 三个 feature 均生效）

`docs/PRD.md` 第 7 节列出 5 个逻辑上独立的合约能力（`YDToken`/`YDFaucet`/`Web3University`/`CourseCertificate`/`DemoCompletionOracle`）。落地前必须在「单体合约」与「分离合约」之间做选择，两者比较如下：

| 维度 | 方案 A：单体合约（一个 `Web3UniversityCore.sol` 包含全部能力） | 方案 B：分离合约（5 个独立合约，通过地址引用互相调用） |
| --- | --- | --- |
| 接口复杂度 | 单一合约对外接口臃肿（ERC-20 + ERC-721 + 业务逻辑混在一份 ABI），调用方难以理解职责边界 | 每个合约接口窄而专一，`YDToken` 只暴露 ERC-20，`CourseCertificate` 只暴露 ERC-721 + 铸造，符合"深模块、窄接口"原则 |
| 模块依赖 | 无跨合约依赖，但内部职责耦合（修改课程审核逻辑有误改到 Token 转账逻辑的风险） | 依赖显式化为合约地址引用（`Web3University` 持有 `YDToken`/`CourseCertificate`/oracle 地址），依赖关系在部署脚本里一目了然 |
| 信息隐藏 | 无法对不同职责应用不同的访问控制粒度（Token 的 Owner 和课程审核的 Owner 被迫是同一套权限系统） | 每个合约独立维护自己的权限模型（`YDToken` 无需任何 Owner 逻辑；`CourseCertificate` 只需要一个 `minter` 地址，不需要理解课程审核流程） |
| 可测试性 | 单元测试必须在一个巨型测试文件里模拟全部前置状态（先铸造、再审核课程、再购买、再完课），测试之间高度耦合 | 各合约可独立测试（`YDToken`/`YDFaucet` 的测试不依赖课程/证书状态），Feature 11/12/13 三个 feature 可以并行开发、独立验收 |
| 修改成本 | 任何一处小改动（如证书元数据格式）都要重新审查整个巨型合约，Gas 优化/审计范围被迫扩大到无关代码 | 修改 `CourseCertificate` 的元数据逻辑不触碰 `YDToken`/`Web3University`，审查范围精确匹配变更范围 |
| 回滚方式 | 单体合约一旦部署，任何模块的缺陷都需要整体重新部署并迁移全部状态（Token 余额、课程数据、证书记录） | 若某个合约需要修复重新部署（如 `CourseCertificate` 逻辑缺陷），`YDToken`（承载用户余额，最不该迁移的状态）与已发生的课程购买记录不受影响，只需在 `Web3University` 里重新指向新的证书合约地址 |
| Gas 成本 | 部署成本集中在一次性大合约部署，跨"模块"调用（合约内部函数调用）零额外 Gas | 部署成本分散到 5 次部署（略高的总部署 Gas），跨合约调用产生 `CALL` 开销（成本可忽略，MVP 教学/演示场景不敏感） |

**结论**：采用**方案 B（分离合约）**。理由：本项目要拆成 3 个独立 feature（11/12/13）并行/串行交付、各自独立验收，分离架构让这个交付节奏成为可能；PRD 本身也是按 5 个独立合约名称+职责描述需求（而非一个巨型合约），分离架构与需求文档的信息结构天然对齐；MVP/教学演示场景对部署 Gas 成本不敏感，换来的可测试性/可维护性收益明显更高。跨合约调用产生的 Gas 开销和额外部署成本是本决策唯一的代价，在教学演示场景下可接受。

## 合约清单与所属 Feature

| 合约 | 所属 Feature | 职责 |
| --- | --- | --- |
| `YDToken.sol` | 11（本 feature） | ERC-20 课程支付代币 |
| `YDFaucet.sol` | 11（本 feature） | 限领水龙头 |
| `Web3University.sol` | 12（初版）+ 13（扩展完课/证书铸造字段） | 老师白名单、课程生命周期、购买、完课确认入口 |
| `CourseCertificate.sol` | 13 | ERC-721 课程完成证书 |
| `DemoCompletionOracle.sol` | 13 | 完课确认的可信提交入口 |

## Foundry 工程骨架

- 路径：`contracts/web3-university/`（新建，独立于 `contracts/*.sol` 两个 Remix 教学示例文件；`forge init` 产生的 `src/`/`test/`/`script/`/`lib/` 全部限定在这个子目录内，不影响仓库根目录或 `contracts/` 顶层的现有文件结构）。
- 依赖：`forge install OpenZeppelin/openzeppelin-contracts` （锁定到 Solidity `^0.8.24` 兼容的最新 release tag，具体版本号在 `contracts/web3-university/lib/` 安装后由 `forge` 生成的 `.gitmodules`/`remappings.txt` 记录，实现阶段确认后回填此处）。
- `foundry.toml` 关键配置：
  ```toml
  [profile.default]
  solc = "0.8.24"
  optimizer = true
  optimizer_runs = 200
  src = "src"
  test = "test"
  script = "script"
  out = "out"
  libs = ["lib"]

  [fmt]
  line_length = 100
  tab_width = 4
  ```
- `remappings.txt`：`@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/`
- `.gitignore`（子目录内，或复用根目录已有规则确认覆盖）：`out/`、`cache/` 不提交；`lib/` 下的依赖源码按 Foundry 惯例提交（`forge install` 默认行为，保证 `forge build` 无需联网即可复现）。

## 功能模块设计

### 模块 1：YDToken（ERC-20）

**接口契约**：

```solidity
contract YDToken is ERC20 {
    constructor(address initialHolder, uint256 initialSupply) ERC20("YD Token", "YD") {
        _mint(initialHolder, initialSupply);
    }
}
```

- 完全复用 OpenZeppelin `ERC20` 的 `transfer`/`approve`/`transferFrom`/`balanceOf`/`allowance`，不重写任何方法——PRD 只要求"标准 ERC-20 能力"，重写等同于引入无需求支撑的自定义风险。
- **不提供 `mint()` 公开入口**：初始供应量在构造函数一次性铸造完毕。若后续里程碑需要增发，应作为新的、有明确需求支撑的变更再引入，而不是现在预留一个当前用不到的权限面。
- `decimals()` 使用 OpenZeppelin 默认实现（返回 18），满足 F-002。

### 模块 2：YDFaucet

**数据模型**：

```solidity
contract YDFaucet {
    IERC20 public immutable ydToken;
    address public immutable owner;
    uint256 public constant CLAIM_AMOUNT = 20e18;

    mapping(address => bool) public hasClaimed; // 地址 => 是否已领取过
}
```

**接口契约**：

- `claim()`：
  1. Checks：`hasClaimed[msg.sender]` 为 `true` → revert `AlreadyClaimed()`；`ydToken.balanceOf(address(this)) < CLAIM_AMOUNT` → revert `InsufficientFaucetBalance()`。
  2. Effects：`hasClaimed[msg.sender] = true`。
  3. Interactions：`ydToken.safeTransfer(msg.sender, CLAIM_AMOUNT)`。
  4. `emit TokensClaimed(msg.sender, CLAIM_AMOUNT)`。
- `fund(uint256 amount)`：`onlyOwner`；`ydToken.safeTransferFrom(msg.sender, address(this), amount)`（Owner 需先对 Faucet 完成 `approve`）；`emit FaucetFunded(msg.sender, amount)`。
- 自定义 error：`error AlreadyClaimed(); error InsufficientFaucetBalance(); error NotOwner();`
- 权限：`owner` 通过构造函数一次性设定（不使用 OpenZeppelin `Ownable` 的可转移所有权——MVP 阶段不需要转移 Faucet 管理权，构造函数固定简单、攻击面更小；`onlyOwner` 修饰符自行实现两行等值比较，不引入额外依赖）。
- 重入：`claim()`/`fund()` 均遵循 Checks-Effects-Interactions（先标记 `hasClaimed`/校验权限，再做外部 `safeTransfer`/`safeTransferFrom`），标准 ERC-20（`YDToken` 无 hook）无重入回调路径，故不额外叠加 `ReentrancyGuard`（避免为不存在的风险引入依赖，`.claude/rules/smart-contract.md` 要求"涉及外部调用...使用重入保护"针对的是有重入风险的场景，此处外部调用对象是本项目自己实现、已知无 hook 的 `YDToken`，风险已通过 CEI 顺序结构性消除）。

### 模块 3：部署脚本

`script/DeployTokenFaucet.s.sol`：

```solidity
contract DeployTokenFaucet is Script {
    function run() external {
        // vm.startBroadcast() 不传入任何私钥参数——脚本只用于本地 forge script 模拟，
        // 真实部署（含私钥/RPC）不在本 feature 范围内，需用户显式提供密钥后另行执行。
        vm.startBroadcast();
        YDToken token = new YDToken(msg.sender, 1_000_000e18);
        YDFaucet faucet = new YDFaucet(address(token), msg.sender);
        token.transfer(address(faucet), 100_000e18);
        vm.stopBroadcast();
    }
}
```

- 仅用 `forge script script/DeployTokenFaucet.s.sol` （无 `--broadcast`、无 `--rpc-url` 指向真实网络）在本地模拟验证部署流程可行，不产生任何链上交易、不需要真实私钥。

## 测试计划

- `YDToken.t.sol`：初始供应量正确铸造到指定地址；`decimals()`/`name()`/`symbol()` 符合规格；标准 `transfer`/`approve`/`transferFrom` 行为（复用 OZ 已测试过的逻辑，此处只做集成验证，不重新测试 OZ 内部实现）。
- `YDFaucet.t.sol`：
  - 首次 `claim()` 成功，余额增加 20 YD，`hasClaimed` 置位，事件正确。
  - 第二次 `claim()` revert `AlreadyClaimed`。
  - Faucet 余额不足时 `claim()` revert `InsufficientFaucetBalance`。
  - `fund()` 非 Owner 调用 revert `NotOwner`。
  - `fund()` Owner 调用成功，Faucet 余额增加，事件正确。
  - Fuzz：`claim()` 对任意非零地址（`vm.assume`）均满足"只能领取一次"不变量。

## 安全考虑

- 遵循 `.claude/rules/smart-contract.md` 审计清单：`claim()`/`fund()` 均有权限/前置条件校验；无重入风险场景不强加 `ReentrancyGuard`（见模块 2 说明），但 CEI 顺序仍严格遵循；关键事件（领取、补充资金）均 `emit`；复用 `YDFaucet` 自己的 `hasClaimed` 校验，不引入不一致的重复实现。
- `YDToken` 不暴露增发入口，从根本上消除"Owner 无限增发稀释持有者"的风险面。
- 部署脚本不包含真实私钥/RPC/广播参数，符合用户"不得读取或提交 `.env.local`、不部署 Sepolia"的强约束。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 合约架构 | 分离合约（方案 B） | 见上文架构决策对比 |
| `YDToken` 增发 | 不提供 `mint()` | PRD 只要求初始供应量一次性铸造，预留增发入口是当前需求不支撑的抽象 |
| `YDFaucet` 权限模型 | 自实现 `onlyOwner`，不用 OZ `Ownable` | MVP 不需要可转移所有权，减少依赖面 |
| 重入保护范围 | `YDFaucet` 不加 `ReentrancyGuard` | 外部调用对象（`YDToken`）无 hook，CEI 顺序已结构性消除重入风险；`Web3University`/`CourseCertificate` 涉及跨合约业务调用时会在各自 feature 中加 `ReentrancyGuard`（见 12、13 design.md） |
