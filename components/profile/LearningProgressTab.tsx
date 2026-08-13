"use client";

import { ProgressBar } from "@/components/learning-center/ProgressBar";
import { mockLessons, mockTransactions } from "@/lib/mock/fixtures";
import { defaultCourseProgress } from "@/lib/mock/profileFixtures";
import { useProfilePurchases } from "@/lib/purchase/useProfilePurchases";

// 与学习中心（feature 5）默认演示进度一致：没有预设进度记录的真实已购课程，
// 展示为"前 3 课已完成"的默认演示态，而不是 0（避免看起来像"买了但完全没学"）。
const DEFAULT_COMPLETED_LESSONS = 3;

export function LearningProgressTab() {
  const purchases = useProfilePurchases();
  // 回退演示数据时展示固定的 3 门课程进度；一旦存在真实购买记录，必须按真实
  // 已购课程过滤（F-005：每门已购课程对应一条进度条），不能继续展示与"已购课程"
  // "购买记录" 两个 Tab 不一致的固定列表。
  const isFallback = purchases === mockTransactions;

  const progressList = isFallback
    ? defaultCourseProgress
    : purchases.map((purchase) => {
        const preset = defaultCourseProgress.find((item) => item.courseId === purchase.courseId);
        if (preset) return preset;

        const totalLessons = mockLessons.filter(
          (lesson) => lesson.courseId === purchase.courseId
        ).length;
        return {
          courseId: purchase.courseId,
          courseName: purchase.courseName,
          completedLessons: Math.min(DEFAULT_COMPLETED_LESSONS, totalLessons),
          totalLessons,
        };
      });

  if (progressList.length === 0) {
    return <p className="text-body-md text-on-surface-variant">暂无学习进度。</p>;
  }

  return (
    <div className="flex flex-col gap-stack-sm">
      {progressList.map((item) => {
        const percent =
          item.totalLessons === 0
            ? 0
            : Math.round((item.completedLessons / item.totalLessons) * 100);
        return (
          <div
            key={item.courseId}
            className="rounded-lg border border-outline-variant bg-surface-container p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-body-md text-on-surface">{item.courseName}</span>
              <span className="font-mono text-label-md text-on-surface-variant">
                {item.completedLessons}/{item.totalLessons}
              </span>
            </div>
            <div className="mt-2">
              <ProgressBar percent={percent} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
