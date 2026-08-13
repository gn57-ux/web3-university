import type { CourseStatus } from "@/lib/mock/types";

export const COURSE_STATUS_LABEL: Record<CourseStatus, string> = {
  active: "已上架",
  pending: "待审核",
  approved: "已通过",
  draft: "草稿",
};

export const COURSE_STATUS_BADGE_CLASS: Record<CourseStatus, string> = {
  active: "bg-secondary-container text-on-secondary-container",
  pending: "bg-tertiary-container text-on-tertiary-container",
  approved: "bg-secondary-container text-on-secondary-container",
  draft: "bg-surface-container-high text-on-surface-variant",
};
