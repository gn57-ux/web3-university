import type { Course } from "./types";

export interface TeacherCourseView extends Course {
  description: string;
  /** 仅待审核课程展示：距提交已过去的天数 */
  submittedDaysAgo?: number;
  /** 仅草稿课程展示：0-100 完成度 */
  draftCompleteness?: number;
  /** 仅已上架课程展示：学生平均学习进度百分比 */
  studentProgressPercent?: number;
  /** 仅草稿课程展示：最后编辑时间的展示文案 */
  lastEditedLabel?: string;
  /** 章节大纲占位字段（表单里"每行一个章节"的原始文本），编辑时需回填 */
  chaptersOutline?: string;
}

export const mockTeacherName = "Alex";

// "Solidity 智能合约入门"复用 lib/mock/fixtures.ts 的 mockCourses[0]（同一 id/讲师/
// 价格/学生数），避免同一门课在课程广场与老师工作台出现不同数据。"DApp 实战"、
// "Security 基础" 是本 feature 独有的新提交课程（尚未上架，不出现在课程广场），
// 不与共享 fixtures 冲突，可独立维护。
export const initialTeacherCourses: TeacherCourseView[] = [
  {
    id: "solidity-101",
    title: "Solidity 智能合约入门",
    teacher: "Prof. Alex Chen",
    priceYD: 4,
    level: "beginner",
    coverUrl: "/mock/covers/solidity-101.svg",
    enrolledCount: 1240,
    status: "active",
    description: "掌握智能合约开发的核心概念，从基础语法到部署。",
    studentProgressPercent: 78,
  },
  {
    id: "dapp-workshop-advanced",
    title: "DApp 实战",
    teacher: "Prof. Alex Chen",
    priceYD: 6,
    level: "intermediate",
    coverUrl: "/mock/covers/web3-dapp.svg",
    enrolledCount: 0,
    status: "pending",
    description: "构建全栈去中心化应用，整合钱包与智能合约。",
    submittedDaysAgo: 2,
  },
  {
    id: "smart-contract-security-101",
    title: "Security 基础",
    teacher: "Prof. Alex Chen",
    priceYD: 6,
    level: "intermediate",
    coverUrl: "",
    enrolledCount: 0,
    status: "draft",
    description: "智能合约常见漏洞与防御措施实战。",
    draftCompleteness: 45,
    lastEditedLabel: "昨天",
  },
];
