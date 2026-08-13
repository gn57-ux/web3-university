import type { Course } from "./types";

export interface PendingCourse extends Course {
  submittedByAddress: string;
  descriptionSummary: string;
}

export interface CompletionRequest {
  studentAddress: string;
  courseId: string;
  courseName: string;
  completionPercent: number;
  minted: boolean;
}

// 与老师工作台（feature 7）的待审课程互相独立，不做跨 feature 数据同步
// （design.md 技术决策：避免为演示态功能引入复杂的跨 feature 状态同步）。
export const initialPendingCourses: PendingCourse[] = [
  {
    id: "advanced-solidity-security",
    title: "Advanced Solidity Security",
    teacher: "0x7fC3f4a9b2E15d8c6f1A0e9D2c4B8f6A1e3D5c7F",
    priceYD: 8,
    level: "expert",
    coverUrl: "/mock/covers/solidity-101.svg",
    enrolledCount: 0,
    status: "pending",
    submittedByAddress: "0x7fC3...9F6F",
    descriptionSummary: "深入探讨重入攻击、抢跑交易与访问控制等智能合约安全实战议题。",
  },
  {
    id: "defi-mechanism-design",
    title: "DeFi Mechanism Design",
    teacher: "0x304aB1c9E7f2D8b5A0c6E4f1B9d3A7c5E2f8B304",
    priceYD: 8,
    level: "expert",
    coverUrl: "/mock/covers/defi-uniswap.svg",
    enrolledCount: 0,
    status: "pending",
    submittedByAddress: "0x304a...2389",
    descriptionSummary: "理解自动做市商、借贷协议与代币经济学的机制设计原理。",
  },
];

export const initialCompletionRequests: CompletionRequest[] = [
  {
    studentAddress: "0x1234...5678",
    courseId: "solidity-101",
    courseName: "Solidity 智能合约入门",
    completionPercent: 100,
    minted: false,
  },
  {
    studentAddress: "0x9e2b...4c81",
    courseId: "defi-uniswap-practical",
    courseName: "DeFi 与 Uniswap 实战",
    completionPercent: 100,
    minted: false,
  },
  {
    studentAddress: "0x6a7d...1f3e",
    courseId: "web3-dapp-from-zero",
    courseName: "从零构建 Web3 DApp",
    completionPercent: 62,
    minted: false,
  },
];
