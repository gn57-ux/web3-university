import type {
  Certificate,
  Course,
  Lesson,
  TeacherApplication,
  Transaction,
  User,
} from "./types";

/**
 * 规范课程价格：docs/PRD.md 全文示例定价与 specs/4.course-detail-mock-purchase 一致，
 * 「Solidity 智能合约入门」统一定价为 4 YD，所有 feature 引用该课程时必须复用该常量，
 * 不得各自编造价格。
 */
export const SOLIDITY_101_PRICE_YD = 4;

export const mockCourses: Course[] = [
  {
    id: "solidity-101",
    title: "Solidity 智能合约入门",
    teacher: "Prof. Alex Chen",
    priceYD: SOLIDITY_101_PRICE_YD,
    level: "beginner",
    coverUrl: "/mock/covers/solidity-101.svg",
    enrolledCount: 1240,
    status: "active",
  },
  {
    id: "web3-dapp-from-zero",
    title: "从零构建 Web3 DApp",
    teacher: "Sarah Wang",
    priceYD: 8,
    level: "intermediate",
    coverUrl: "/mock/covers/web3-dapp.svg",
    enrolledCount: 856,
    status: "active",
  },
  {
    id: "defi-uniswap-practical",
    title: "DeFi 与 Uniswap 实战",
    teacher: "Dr. Robert Lee",
    // specs/2.homepage/design.md：非 Solidity 101 的精选课程按周期比例设更高档位价格，
    // 8 周进阶课程 = Solidity 101（4 周/4 YD）的 2 倍。
    priceYD: 8,
    level: "expert",
    coverUrl: "/mock/covers/defi-uniswap.svg",
    enrolledCount: 540,
    status: "active",
  },
];

// 与 lib/mock/courseDetails.ts 的 curriculum 条目一一对应（同一 id 前缀、同一中文标题），
// 保证课程详情页的"课程大纲"预览与学习中心的实际章节列表描述同一批模块，不产生两套说法。
export const mockLessons: Lesson[] = [
  { id: "l1", courseId: "solidity-101", title: "以太坊与 EVM 简介", order: 1, isPreview: true, durationMinutes: 15 },
  {
    id: "l2",
    courseId: "solidity-101",
    title: "Solidity 基础：类型与变量",
    order: 2,
    isPreview: false,
    durationMinutes: 20,
  },
  { id: "l3", courseId: "solidity-101", title: "函数与修饰符", order: 3, isPreview: false, durationMinutes: 25 },
  {
    id: "l4",
    courseId: "solidity-101",
    title: "高级模式：接口与继承",
    order: 4,
    isPreview: false,
    durationMinutes: 35,
  },
  {
    id: "l5",
    courseId: "solidity-101",
    title: "安全 101：重入与溢出",
    order: 5,
    isPreview: false,
    durationMinutes: 40,
  },
  {
    id: "w1",
    courseId: "web3-dapp-from-zero",
    title: "DApp 架构与技术选型",
    order: 1,
    isPreview: true,
    durationMinutes: 18,
  },
  {
    id: "w2",
    courseId: "web3-dapp-from-zero",
    title: "钱包连接与账户状态",
    order: 2,
    isPreview: false,
    durationMinutes: 25,
  },
  {
    id: "w3",
    courseId: "web3-dapp-from-zero",
    title: "合约读写与交易状态",
    order: 3,
    isPreview: false,
    durationMinutes: 30,
  },
  {
    id: "w4",
    courseId: "web3-dapp-from-zero",
    title: "链上数据展示与缓存",
    order: 4,
    isPreview: false,
    durationMinutes: 28,
  },
  {
    id: "w5",
    courseId: "web3-dapp-from-zero",
    title: "测试网部署与发布",
    order: 5,
    isPreview: false,
    durationMinutes: 35,
  },
  {
    id: "d1",
    courseId: "defi-uniswap-practical",
    title: "DeFi 生态与核心概念",
    order: 1,
    isPreview: true,
    durationMinutes: 20,
  },
  {
    id: "d2",
    courseId: "defi-uniswap-practical",
    title: "自动做市商（AMM）原理",
    order: 2,
    isPreview: false,
    durationMinutes: 30,
  },
  {
    id: "d3",
    courseId: "defi-uniswap-practical",
    title: "Uniswap V2 合约拆解",
    order: 3,
    isPreview: false,
    durationMinutes: 40,
  },
  {
    id: "d4",
    courseId: "defi-uniswap-practical",
    title: "流动性池实战搭建",
    order: 4,
    isPreview: false,
    durationMinutes: 45,
  },
  {
    id: "d5",
    courseId: "defi-uniswap-practical",
    title: "闪电贷与套利风险",
    order: 5,
    isPreview: false,
    durationMinutes: 30,
  },
];

export const mockCurrentUser: User = {
  address: "0x1234567890abcdef1234567890abcdef12345678",
  username: "Web3Student",
  role: "student",
  ydBalance: 16,
};

export const mockCertificates: Certificate[] = [
  {
    tokenId: "4829",
    courseId: "solidity-101",
    courseName: "Solidity 智能合约入门",
    ownerAddress: mockCurrentUser.address,
    mintedAt: "2026-07-01T10:00:00.000Z",
  },
  // Stitch 个人中心截图第二张证书卡片示例（DeFi 实战证书，Token ID #1092），
  // 沿用已有的 defi-uniswap-practical 课程记录，不新造课程名称。
  {
    tokenId: "1092",
    courseId: "defi-uniswap-practical",
    courseName: "DeFi 与 Uniswap 实战",
    ownerAddress: mockCurrentUser.address,
    mintedAt: "2026-07-20T15:00:00.000Z",
  },
];

export const mockTransactions: Transaction[] = [
  {
    courseId: "solidity-101",
    courseName: "Solidity 智能合约入门",
    priceYD: SOLIDITY_101_PRICE_YD,
    purchasedAt: "2026-06-20T08:30:00.000Z",
    txHash: "0xmock1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef123456",
  },
  {
    courseId: "defi-uniswap-practical",
    courseName: "DeFi 与 Uniswap 实战",
    priceYD: 8,
    purchasedAt: "2026-07-15T09:45:00.000Z",
    txHash: "0xmock7a8b9c0d1e2f3456abcdef7890abcdef1234567890abcdef1234567890",
  },
  {
    courseId: "web3-dapp-from-zero",
    courseName: "从零构建 Web3 DApp",
    priceYD: 8,
    purchasedAt: "2026-08-05T13:20:00.000Z",
    txHash: "0xmock2c3d4e5f6a7b8901cdef1234567890abcdef1234567890abcdef123456",
  },
];

export const mockTeacherApplications: TeacherApplication[] = [
  { address: "0xaaaa1111bbbb2222cccc3333dddd4444eeee5555", addedAt: "2026-03-01", active: true },
  { address: "0xffff6666aaaa7777bbbb8888cccc9999dddd0000", addedAt: "2026-03-15", active: true },
];
