import { BarChart3, ImageOff, Pencil, Users } from "lucide-react";
import Image from "next/image";
import { ProgressBar } from "@/components/learning-center/ProgressBar";
import type { TeacherCourseView } from "@/lib/mock/teacherFixtures";
import { COURSE_STATUS_BADGE_CLASS, COURSE_STATUS_LABEL } from "./courseStatus";

interface TeacherCourseCardProps {
  course: TeacherCourseView;
  onEdit: (course: TeacherCourseView) => void;
  onSubmitForReview: (courseId: string) => void;
  onViewAnalytics: (course: TeacherCourseView) => void;
}

export function TeacherCourseCard({
  course,
  onEdit,
  onSubmitForReview,
  onViewAnalytics,
}: TeacherCourseCardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container">
      <div className="relative aspect-video w-full bg-surface-container-high">
        {course.coverUrl && course.coverUrl.startsWith("/") ? (
          // 本地 Mock 封面（public/mock/covers/*）走 next/image 优化。
          <Image src={course.coverUrl} alt={course.title} fill className="object-cover" />
        ) : course.coverUrl ? (
          // 老师在表单里可以填任意外部图片 URL（SubmitCourseModal 的"封面图 URL"字段），
          // next.config.ts 未配置 images.remotePatterns，next/image 遇到未知域名会直接
          // 抛错崩溃；这类用户自定义 URL 改用普通 <img>，不受远程域名白名单限制。
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.coverUrl}
            alt={course.title}
            className="size-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ImageOff className="size-8 text-on-surface-variant" aria-hidden="true" />
          </div>
        )}
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 font-mono text-label-md ${COURSE_STATUS_BADGE_CLASS[course.status]}`}
        >
          {COURSE_STATUS_LABEL[course.status]}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-heading text-headline-md text-on-surface">{course.title}</h3>
        <p className="text-body-md text-on-surface-variant">{course.description}</p>

        {course.status === "active" && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-label-md text-on-surface-variant">
              <span>学生进度</span>
              <span className="font-mono">{course.studentProgressPercent ?? 0}%</span>
            </div>
            <div className="mt-1">
              <ProgressBar percent={course.studentProgressPercent ?? 0} />
            </div>
          </div>
        )}

        {course.status === "draft" && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-label-md text-on-surface-variant">
              <span>完成度</span>
              <span className="font-mono">{course.draftCompleteness ?? 0}%</span>
            </div>
            <div className="mt-1">
              <ProgressBar percent={course.draftCompleteness ?? 0} />
            </div>
          </div>
        )}

        {course.status === "pending" && (
          <p className="mt-2 text-label-md text-on-surface-variant">
            提交于 {course.submittedDaysAgo ?? 0} 天前
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-3">
          {course.status === "active" ? (
            <span className="flex items-center gap-1.5 text-label-md font-mono text-on-surface-variant">
              <Users className="size-3.5" aria-hidden="true" />
              {course.enrolledCount.toLocaleString()} Students
            </span>
          ) : course.status === "draft" ? (
            <span className="text-label-md text-on-surface-variant">
              最后编辑: {course.lastEditedLabel ?? "—"}
            </span>
          ) : (
            <span aria-hidden="true" />
          )}

          <div className="flex items-center gap-1">
            {course.status === "active" && (
              <button
                type="button"
                onClick={() => onViewAnalytics(course)}
                aria-label={`查看《${course.title}》数据分析`}
                className="flex size-8 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              >
                <BarChart3 className="size-4" aria-hidden="true" />
              </button>
            )}
            {course.status === "draft" && (
              <button
                type="button"
                onClick={() => onSubmitForReview(course.id)}
                disabled={course.description.trim() === ""}
                title={course.description.trim() === "" ? "请先在编辑中补全课程描述" : undefined}
                className="rounded-md border border-outline-variant px-3 py-1.5 text-label-md font-medium text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
              >
                提交审核
              </button>
            )}
            <button
              type="button"
              onClick={() => onEdit(course)}
              aria-label={`编辑《${course.title}》`}
              className="flex size-8 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
