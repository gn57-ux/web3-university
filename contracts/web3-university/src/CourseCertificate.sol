// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title Course Certificate
/// @notice 课程完成证书，基于 OpenZeppelin ERC721；只有被授权的铸造者（`minter`，
///         即 [[12.course-marketplace-contract]] 的 `Web3University`）可以铸造。
/// @dev 本合约不理解课程业务规则（价格、审核状态、购买记录），只负责"谁能铸造、铸造给谁、
///      每个 `(courseId, student)` 只能有一枚"——课程业务知识只归属 `Web3University`
///      （单一归属），本合约保持窄接口、深模块。`minter` 与 `Web3University` 部署时存在循环
///      依赖（`Web3University` 需要 `certificate` 地址，`CourseCertificate` 需要
///      `Web3University` 地址作为 `minter`），构造函数无法一次闭环，采用"先部署、后接线"
///      模式：本合约部署时 `minter` 为零地址，由 Owner 在 `Web3University` 部署完成后调用
///      `setMinter` 一次性接线。权限模型延续 `Web3University`/`YDFaucet` 自实现 `onlyOwner`
///      （构造函数一次性设定，不可转移）的风格，不使用 OpenZeppelin `Ownable`。
contract CourseCertificate is ERC721 {
    /// @notice 证书数据
    struct CertificateData {
        uint256 courseId; // 对应课程 ID
        address student; // 学生地址
        uint256 completedAt; // 完成（铸造）时间戳
    }

    /// @notice 有权管理本合约的地址，部署后不可更改
    address public immutable owner;

    /// @notice 唯一被授权铸造证书的地址（`Web3University` 部署后由 Owner 接线设置）
    address public minter;

    /// @notice 下一个待分配的 tokenId；从 1 开始自增，0 保留作"不存在"哨兵值
    uint256 public nextTokenId;

    /// @notice tokenId => 证书数据
    mapping(uint256 => CertificateData) public certificateData;

    /// @notice courseId => student => 是否已持有该课程的证书，防止同一学生同一课程重复铸造
    mapping(uint256 => mapping(address => bool)) public hasCertificate;

    /// @notice tokenId => 元数据 URI（由铸造调用方在 `mint` 时传入，MVP 阶段复用课程 metadataURI）
    mapping(uint256 => string) private _tokenURIs;

    /// @notice 铸造成功时触发
    event CertificateMinted(
        address indexed student, uint256 indexed courseId, uint256 indexed tokenId
    );

    /// @notice `minter` 被 Owner 更新时触发
    event MinterUpdated(address indexed newMinter);

    /// @notice 构造函数传入零地址时抛出——owner 为 immutable，部署后无法修复，
    ///         零地址会导致管理功能（接线 minter）永久不可用
    error ZeroAddress();

    /// @notice 非 owner 调用受限函数时抛出
    error NotOwner();

    /// @notice 非授权铸造者调用 `mint` 时抛出
    error NotMinter();

    /// @notice 同一 `(courseId, student)` 组合重复铸造时抛出
    error CertificateAlreadyMinted();

    /// @notice 仅 owner 可调用
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @notice 仅授权铸造者可调用
    modifier onlyMinter() {
        if (msg.sender != minter) revert NotMinter();
        _;
    }

    /// @param owner_ 有权管理本合约（接线 minter）的地址
    constructor(address owner_) ERC721("Web3 University Course Certificate", "W3UCERT") {
        if (owner_ == address(0)) revert ZeroAddress();
        owner = owner_;
    }

    /// @notice 接线授权铸造者地址，预期在 `Web3University` 部署完成后由 Owner 调用一次；
    ///         不禁止重复调用以保留紧急更换核心合约地址的能力，每次调用发出事件可追溯
    /// @param newMinter 新的授权铸造者地址
    function setMinter(address newMinter) external onlyOwner {
        minter = newMinter;
        emit MinterUpdated(newMinter);
    }

    /// @notice 授权铸造者为学生铸造课程完成证书
    /// @param student 学生地址
    /// @param courseId 对应课程 ID
    /// @param tokenURI_ 证书元数据 URI（由调用方传入，MVP 阶段复用课程 metadataURI）
    /// @return tokenId 新铸造证书的 tokenId
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

        _safeMint(student, tokenId);

        emit CertificateMinted(student, courseId, tokenId);
    }

    /// @notice 返回铸造时传入的证书元数据 URI
    /// @param tokenId 目标 tokenId
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId); // OZ v5 ERC721 提供的存在性校验
        return _tokenURIs[tokenId];
    }
}
