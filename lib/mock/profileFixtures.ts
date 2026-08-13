export interface CourseProgress {
  courseId: string;
  courseName: string;
  completedLessons: number;
  totalLessons: number;
}

// 学习进度是纯展示性 Mock 数据，与学习中心（feature 5）页面内的本地演示进度
// （刷新即重置）相互独立，不做跨 feature 状态同步——这里代表"已记录的长期进度"。
// 已铸造证书的课程视为 5/5 已完成，与 mockCertificates 保持叙事一致。
// 注意：这份列表只在"无真实购买记录，回退展示演示数据"时整份使用；一旦存在真实
// 购买记录，components/profile/LearningProgressTab.tsx 会按购买的 courseId 过滤/
// 合成，不会不加区分地展示这里的全部 3 条（否则会和"已购课程"/"购买记录" Tab
// 已经切换到真实数据的状态矛盾）。
export const defaultCourseProgress: CourseProgress[] = [
  {
    courseId: "solidity-101",
    courseName: "Solidity 智能合约入门",
    completedLessons: 5,
    totalLessons: 5,
  },
  {
    courseId: "defi-uniswap-practical",
    courseName: "DeFi 与 Uniswap 实战",
    completedLessons: 5,
    totalLessons: 5,
  },
  {
    courseId: "web3-dapp-from-zero",
    courseName: "从零构建 Web3 DApp",
    completedLessons: 2,
    totalLessons: 5,
  },
];
