# course-certificate-completion — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-19 | v1 | 初始设计 |

## 项目架构

- 架构类型: 单体仓库，沿用 [[11.yd-token-faucet]] 建立的 Foundry 子工程
- 涉及层: 智能合约
- 沿用 [[11.yd-token-faucet]] design.md 已确定的分离合约架构结论

## 部署与接线顺序（循环依赖处理）

`CourseCertificate` 需要知道谁能铸造（`Web3University` 地址），`Web3University` 需要知道证书合约地址和预言机地址，`DemoCompletionOracle` 需要知道 `Web3University` 地址——三者存在部署时的循环依赖，构造函数参数无法一次性闭环。采用"先部署、后接线"模式：

1. 部署 `CourseCertificate`（不带任何铸造者地址，`minter` 初始为 `address(0)`）。
2. 部署 `Web3University`（已在 [[12.course-marketplace-contract]] 完成，本 feature 新增两个 `onlyOwner` 设置函数，不改动构造函数签名）。
3. 部署 `DemoCompletionOracle`（传入 `Web3University` 地址，构造时即可确定，无循环依赖）。
4. Owner 依次调用：`CourseCertificate.setMinter(web3UniversityAddress)`、`Web3University.setCertificate(certificateAddress)`、`Web3University.setOracle(oracleAddress)`。

这一顺序在部署脚本（T-006）中体现，全部为本地 dry-run，不广播到真实网络。

## 功能模块设计

### 模块 1：CourseCertificate（ERC-721）

**数据模型**：

```solidity
struct CertificateData {
    uint256 courseId;
    address student;
    uint256 completedAt;
}

address public minter; // 唯一被授权铸造的地址（Web3University 部署后由 Owner 接线设置）
address public immutable owner;
uint256 public nextTokenId; // 自增，从 1 开始
mapping(uint256 => CertificateData) public certificateData; // tokenId => 证书数据
mapping(uint256 => mapping(address => bool)) public hasCertificate; // courseId => student => 是否已持有证书
mapping(uint256 => string) private _tokenURIs; // tokenId => 元数据 URI（由铸造调用方传入）
```

**接口契约**：

```solidity
function setMinter(address newMinter) external onlyOwner {
    minter = newMinter;
    emit MinterUpdated(newMinter);
}

function mint(address student, uint256 courseId, string calldata tokenURI_)
    external
    onlyMinter
    returns (uint256 tokenId)
{
    if (hasCertificate[courseId][student]) revert CertificateAlreadyMinted();

    tokenId = ++nextTokenId;
    hasCertificate[courseId][student] = true;
    certificateData[tokenId] = CertificateData(courseId, student, block.timestamp);
    _tokenURIs[tokenId] = tokenURI_;

    _safeMint(student, tokenId); // OpenZeppelin ERC721 内部函数

    emit CertificateMinted(student, courseId, tokenId);
}

function tokenURI(uint256 tokenId) public view override returns (string memory) {
    _requireOwned(tokenId); // OZ v5 ERC721 提供的存在性校验
    return _tokenURIs[tokenId];
}
```

- **`CourseCertificate` 不理解课程业务规则**（不知道价格、审核状态、购买记录），只负责"谁能铸造、铸造给谁、每个 `(courseId, student)` 只能有一枚"——保持窄接口、深模块：课程业务知识只归属 `Web3University`，本合约不重复承载。
- `tokenURI_` 由 `Web3University` 在调用 `mint` 时传入（MVP 阶段直接复用课程的 `metadataURI`，或未来可扩展为独立的证书专属元数据 URI——本次不预先设计该扩展点，按当前需求最简实现：`Web3University.markCompleted` 内部读取 `courses[courseId].metadataURI` 传给 `mint`）。
- `onlyMinter` 修饰符：`if (msg.sender != minter) revert NotMinter();`。

### 模块 2：DemoCompletionOracle

**数据模型**：

```solidity
address public immutable owner;
address public immutable web3University;
mapping(address => bool) public isTrustedSubmitter;
```

**接口契约**：

```solidity
function setTrustedSubmitter(address submitter, bool trusted) external onlyOwner {
    isTrustedSubmitter[submitter] = trusted;
    emit TrustedSubmitterUpdated(submitter, trusted);
}

function confirmCompletion(address student, uint256 courseId) external onlySubmitter {
    IWeb3University(web3University).markCompleted(student, courseId);
}
```

- **重复确认防护的单一归属**：`DemoCompletionOracle` 本身不维护"是否已提交过"的重复状态——`Web3University.markCompleted` 已经是唯一权威的"该学生该课程是否已完成"状态源（`completed` mapping）。`DemoCompletionOracle` 重复提交同一 `(student, courseId)` 会被 `Web3University` 的 `CourseAlreadyCompleted` revert 直接拒绝。若在 Oracle 层再维护一份重复状态，会形成两处独立记录同一件事实的重复实现（违反"设计知识只能有一个归属"），且两处状态可能因未来任何一处遗漏更新而不一致。PRD 要求的"防止重复确认"通过这种组合（Oracle 转发 + 核心合约把关）已经完整满足，不需要重复实现。

### 模块 3：Web3University 扩展（新增，不改动已有接口）

**新增数据模型**：

```solidity
address public oracle;      // 唯一被授权调用 markCompleted 的地址
address public certificate; // CourseCertificate 实例地址
mapping(uint256 => mapping(address => bool)) public completed; // courseId => student => 是否已完成
```

**新增接口契约**：

```solidity
function setOracle(address newOracle) external onlyOwner {
    oracle = newOracle;
    emit OracleUpdated(newOracle);
}

function setCertificate(address newCertificate) external onlyOwner {
    certificate = newCertificate;
    emit CertificateContractUpdated(newCertificate);
}

function markCompleted(address student, uint256 courseId) external nonReentrant onlyOracle {
    _requireCourseExists(courseId); // 复用 Web3University 已有的私有存在性校验，见下方修订记录
    if (!hasPurchased[courseId][student]) revert CourseNotPurchased();
    if (completed[courseId][student]) revert CourseAlreadyCompleted();

    completed[courseId][student] = true; // Effects 先于外部调用

    emit CourseCompleted(student, courseId, block.timestamp);

    ICourseCertificate(certificate).mint(student, courseId, courses[courseId].metadataURI);
}
```

- `onlyOracle` 修饰符：`if (msg.sender != oracle) revert NotOracle();`。
- Checks-Effects-Interactions：`completed[courseId][student] = true` 与 `emit CourseCompleted` 都在外部调用 `certificate.mint(...)` **之前**完成，`nonReentrant` 作为纵深防御——即使 `CourseCertificate.mint` 未来被扩展出意外的外部回调路径，`markCompleted` 自身的状态已经先行落定，不会被重入利用来重复铸造（`completed` 已置位，重入调用会在第二次进入时立刻被 `CourseAlreadyCompleted` 拒绝）。
- 若 `certificate.mint` revert（例如证书已存在——理论上不该发生，因为 `completed` 已经防止了重复调用，但作为纵深防御 `CourseCertificate` 自己也保留 `hasCertificate` 校验），整个 `markCompleted` 交易回滚，`completed` 状态也一并回滚，不会出现"标记完成但没有证书"的不一致态。

## 接口契约（合约级 ABI 摘要，新增部分）

| 合约 | 函数 | 权限 | 说明 |
| --- | --- | --- | --- |
| `CourseCertificate` | `setMinter(address)` | Owner | 接线授权铸造者 |
| `CourseCertificate` | `mint(address, uint256, string)` | `minter`（`Web3University`） | 铸造证书 |
| `CourseCertificate` | `tokenURI(uint256)` | 只读 | 证书元数据 |
| `DemoCompletionOracle` | `setTrustedSubmitter(address, bool)` | Owner | 管理受信任提交者 |
| `DemoCompletionOracle` | `confirmCompletion(address, uint256)` | 受信任提交者 | 转发完课确认 |
| `Web3University` | `setOracle(address)` | Owner | 接线授权预言机 |
| `Web3University` | `setCertificate(address)` | Owner | 接线证书合约地址 |
| `Web3University` | `markCompleted(address, uint256)` | `oracle`（`DemoCompletionOracle`） | 记录完成 + 铸造证书 |

## 数据模型

见模块 1/2/3 的 struct/mapping 定义；`completed` 是 `Web3University` 内的唯一权威完成状态源，`CourseCertificate.hasCertificate` 是证书合约自身的纵深防御校验（两处校验目的不同：前者是业务规则"是否完成"，后者是 NFT 合约自身"是否已铸造"的不变量，不构成重复实现同一知识）。

## 安全考虑

- 铸造权限收敛到唯一 `minter` 地址（`Web3University`），`DemoCompletionOracle` 无法绕过 `Web3University` 直接铸造证书。
- `markCompleted` 校验学生必须已购买课程（`hasPurchased`），杜绝"未付费学生凭空获得证书"。
- 重复确认/重复铸造防护集中在 `Web3University.completed`（单一归属），`CourseCertificate.hasCertificate` 作为独立合约自身不变量的第二道防线。
- 部署接线函数（`setMinter`/`setOracle`/`setCertificate`）均 `onlyOwner`，且预期只在部署后调用一次（不禁止重复调用以保留紧急更换预言机/证书合约地址的能力，但每次调用都发出事件，链上可追溯）。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 部署循环依赖处理 | 先部署后接线（Owner 调用 setter） | 构造函数无法表达循环引用，这是 Solidity 处理多合约相互引用的标准模式 |
| Oracle 重复确认防护 | 不在 `DemoCompletionOracle` 重复维护状态，依赖 `Web3University.completed` | 单一数据源，避免两处状态不一致（见模块 2 说明） |
| 证书元数据 URI | 复用课程 `metadataURI`，不新增证书专属字段 | 当前需求未要求证书元数据与课程元数据不同，避免预留用不到的抽象 |
| 铸造后再次校验 | `CourseCertificate.hasCertificate` 独立于 `Web3University.completed` 再校验一次 | 纵深防御：两个独立合约各自的不变量不应该只依赖对方正确调用来保证 |
| `markCompleted` 课程存在性判断 | 复用 `_requireCourseExists` 私有 helper | 初版伪代码写的 `courseId >= nextCourseId` 与 [[12.course-marketplace-contract]] 已修正过的同一处 off-by-one 错误同源（`createCourse` 用 `++nextCourseId` 前缀自增，合法范围是闭区间 `[1, nextCourseId]`，判断需用 `>`）。实现阶段没有重新复制一份错误判断，而是直接复用 `Web3University` 已有的 `_requireCourseExists` 私有函数——既修正了 bug，也避免同一条业务规则（"课程是否存在"）出现第二处独立实现 |
