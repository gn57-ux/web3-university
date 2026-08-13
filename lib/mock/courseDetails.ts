import type { Course } from "./types";
import { mockCourses, SOLIDITY_101_PRICE_YD } from "./fixtures";

export interface CourseCurriculumItem {
  id: string;
  order: number;
  title: string;
  summary: string;
}

export interface CourseReview {
  author: string;
  rating: number;
  comment: string;
}

export interface CourseDetail extends Course {
  description: string;
  curriculum: CourseCurriculumItem[];
  reviews: CourseReview[];
  requiredBalanceYD: number;
}

const courseDetails: Record<string, CourseDetail> = {
  "solidity-101": {
    ...mockCourses[0],
    priceYD: SOLIDITY_101_PRICE_YD,
    description:
      "融合以太坊虚拟机（EVM）理论与实践编码的入门课程，带你从零掌握 Solidity 智能合约开发的核心概念，为后续更进阶的 DeFi、NFT 开发打下坚实基础。",
    requiredBalanceYD: 20,
    curriculum: [
      {
        id: "l1",
        order: 1,
        title: "以太坊与 EVM 简介",
        summary: "理解以太坊虚拟机的运行原理，以及智能合约在链上的执行方式。",
      },
      {
        id: "l2",
        order: 2,
        title: "Solidity 基础：类型与变量",
        summary: "掌握 Solidity 的基础数据类型、状态变量与内存布局。",
      },
      {
        id: "l3",
        order: 3,
        title: "函数与修饰符",
        summary: "学习函数可见性、修饰符（modifier）与常见的访问控制模式。",
      },
      {
        id: "l4",
        order: 4,
        title: "高级模式：接口与继承",
        summary: "通过接口与继承组织可扩展、可复用的合约代码结构。",
      },
      {
        id: "l5",
        order: 5,
        title: "安全 101：重入与溢出",
        summary: "识别并防范重入攻击、整数溢出等常见智能合约安全隐患。",
      },
    ],
    reviews: [
      {
        author: "0x7f3a...b1c2",
        rating: 5,
        comment: "课程内容深入浅出，从 EVM 原理讲起再落地到实际编码，非常扎实。",
      },
      {
        author: "0x4a91...e6d8",
        rating: 5,
        comment: "安全章节讲得特别好，重入攻击的例子一下就理解了，实用性很强。",
      },
    ],
  },
  "defi-uniswap-practical": {
    ...mockCourses[2],
    description:
      "面向已掌握 Solidity 基础的进阶开发者，深入 DeFi 核心协议设计与 Uniswap 自动做市商（AMM）机制，从恒定乘积公式到流动性池实战搭建，掌握链上金融应用的核心构建能力。",
    requiredBalanceYD: 8,
    curriculum: [
      {
        id: "d1",
        order: 1,
        title: "DeFi 生态与核心概念",
        summary: "理解去中心化金融的基本组成：借贷、DEX、稳定币与流动性挖矿。",
      },
      {
        id: "d2",
        order: 2,
        title: "自动做市商（AMM）原理",
        summary: "掌握恒定乘积公式 x*y=k，理解滑点、无常损失与价格发现机制。",
      },
      {
        id: "d3",
        order: 3,
        title: "Uniswap V2 合约拆解",
        summary: "阅读 Uniswap V2 核心合约源码，理解 Pair、Router、Factory 三者协作方式。",
      },
      {
        id: "d4",
        order: 4,
        title: "流动性池实战搭建",
        summary: "在测试网部署一个简化版流动性池合约，完成添加/移除流动性与代币兑换。",
      },
      {
        id: "d5",
        order: 5,
        title: "闪电贷与套利风险",
        summary: "理解闪电贷原理及其在套利、清算场景中的应用与常见攻击手法。",
      },
    ],
    reviews: [
      {
        author: "0x9c2e...4f7a",
        rating: 5,
        comment: "Uniswap 源码拆解讲得很细，看完终于搞懂了 AMM 的定价逻辑。",
      },
      {
        author: "0x1d88...aa03",
        rating: 4,
        comment: "内容偏进阶，建议先修完 Solidity 入门课程再来，收获会更大。",
      },
    ],
  },
};

export function getCourseDetail(courseId: string): CourseDetail | null {
  return courseDetails[courseId] ?? null;
}
