export type CourseLevel = "beginner" | "intermediate" | "expert";
export type CourseStatus = "draft" | "pending" | "approved" | "active";

export interface Course {
  id: string;
  title: string;
  teacher: string;
  priceYD: number;
  level: CourseLevel;
  coverUrl: string;
  enrolledCount: number;
  status: CourseStatus;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  order: number;
  isPreview: boolean;
}

export type UserRole = "student" | "teacher" | "owner";

export interface User {
  address: string;
  username: string;
  role: UserRole;
  ydBalance: number;
}

export interface Certificate {
  tokenId: string;
  courseId: string;
  courseName: string;
  ownerAddress: string;
  mintedAt: string;
}

export interface Transaction {
  courseId: string;
  courseName: string;
  priceYD: number;
  purchasedAt: string;
  txHash: string;
}

export interface TeacherApplication {
  address: string;
  addedAt: string;
  active: boolean;
}
