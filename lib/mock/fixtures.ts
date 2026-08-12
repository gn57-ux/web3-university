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
 * 统一为 4 YD。所有 feature 引用「Solidity 智能合约入门」时必须复用该常量，不得各自编造价格。
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
    priceYD: 12,
    level: "expert",
    coverUrl: "/mock/covers/defi-uniswap.svg",
    enrolledCount: 540,
    status: "active",
  },
];

export const mockLessons: Lesson[] = [
  { id: "l1", courseId: "solidity-101", title: "以太坊与 EVM 简介", order: 1, isPreview: true },
  { id: "l2", courseId: "solidity-101", title: "Solidity 基础：类型与变量", order: 2, isPreview: false },
  { id: "l3", courseId: "solidity-101", title: "函数与修饰符", order: 3, isPreview: false },
  { id: "l4", courseId: "solidity-101", title: "高级模式：接口与继承", order: 4, isPreview: false },
  { id: "l5", courseId: "solidity-101", title: "安全 101：重入与溢出", order: 5, isPreview: false },
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
];

export const mockTransactions: Transaction[] = [
  {
    courseId: "solidity-101",
    courseName: "Solidity 智能合约入门",
    priceYD: SOLIDITY_101_PRICE_YD,
    purchasedAt: "2026-06-20T08:30:00.000Z",
    txHash: "0xmock1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef123456",
  },
];

export const mockTeacherApplications: TeacherApplication[] = [
  { address: "0xaaaa1111bbbb2222cccc3333dddd4444eeee5555", addedAt: "2026-03-01", active: true },
  { address: "0xffff6666aaaa7777bbbb8888cccc9999dddd0000", addedAt: "2026-03-15", active: true },
];
