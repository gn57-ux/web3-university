import { BarChart3, Coins, TrendingUp, Users } from "lucide-react";
import type { TeacherCourseView } from "@/lib/mock/teacherFixtures";

interface CourseAnalyticsModalProps {
  course: TeacherCourseView;
  onClose: () => void;
}

export function CourseAnalyticsModal({ course, onClose }: CourseAnalyticsModalProps) {
  const revenueYD = course.enrolledCount * course.priceYD;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-analytics-title"
        className="w-full max-w-md rounded-lg border border-outline-variant bg-surface-container p-6"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-primary" aria-hidden="true" />
          <h2 id="course-analytics-title" className="font-heading text-headline-md text-on-surface">
            {course.title} · 数据分析
          </h2>
        </div>
        <p className="mt-1 text-label-md text-on-surface-variant">
          演示模式：以下为 Mock 数据，无真实统计接口。
        </p>

        <div className="mt-stack-sm grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-outline-variant p-3">
            <p className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
              <Users className="size-3.5" aria-hidden="true" />
              学生数
            </p>
            <p className="mt-1 font-mono text-headline-md text-on-surface">
              {course.enrolledCount.toLocaleString()}
            </p>
          </div>
          <div className="rounded-md border border-outline-variant p-3">
            <p className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
              <TrendingUp className="size-3.5" aria-hidden="true" />
              平均进度
            </p>
            <p className="mt-1 font-mono text-headline-md text-on-surface">
              {course.studentProgressPercent ?? 0}%
            </p>
          </div>
          <div className="rounded-md border border-outline-variant p-3">
            <p className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
              <Coins className="size-3.5" aria-hidden="true" />
              累计收入
            </p>
            <p className="mt-1 font-mono text-headline-md text-tertiary">{revenueYD} YD</p>
          </div>
        </div>

        <div className="mt-stack-md flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-outline-variant px-4 py-2 text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container-high"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
