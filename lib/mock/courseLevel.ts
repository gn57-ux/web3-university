import type { CourseLevel } from "./types";

export const COURSE_LEVEL_LABEL: Record<CourseLevel, string> = {
  beginner: "初级",
  intermediate: "中级",
  expert: "高级",
};

/** 难度徽标配色：初级=薄荷绿(secondary)，中级=琥珀(tertiary)，高级=紫罗兰(primary) */
export const COURSE_LEVEL_BADGE_CLASS: Record<CourseLevel, string> = {
  beginner: "bg-secondary-container text-on-secondary-container",
  intermediate: "bg-tertiary-container text-on-tertiary-container",
  expert: "bg-primary-container text-on-primary-container",
};
