import { Check, X } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import type { PendingCourse } from "@/lib/mock/adminFixtures";

interface CourseReviewQueueProps {
  pendingCourses: PendingCourse[];
  approvedCourses: PendingCourse[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

function CourseCard({
  course,
  actions,
}: {
  course: PendingCourse;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container">
      <div className="relative aspect-video w-full bg-surface-container-high">
        <Image src={course.coverUrl} alt={course.title} fill className="object-cover" />
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 font-mono text-label-md ${
            course.status === "active"
              ? "bg-secondary-container text-on-secondary-container"
              : "bg-tertiary-container text-on-tertiary-container"
          }`}
        >
          {course.status === "active" ? "已上架" : "待审核"}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-heading text-headline-md text-on-surface">{course.title}</h3>
        <p className="font-mono text-label-md text-on-surface-variant">
          讲师：{course.submittedByAddress}
        </p>
        <p className="text-body-md text-on-surface-variant">{course.descriptionSummary}</p>
        {actions && <div className="mt-auto flex items-center gap-2 pt-2">{actions}</div>}
      </div>
    </div>
  );
}

export function CourseReviewQueue({
  pendingCourses,
  approvedCourses,
  onApprove,
  onReject,
}: CourseReviewQueueProps) {
  return (
    <div className="flex flex-col gap-stack-md">
      <div>
        <h3 className="text-headline-md font-heading text-on-surface">待审核</h3>
        {pendingCourses.length === 0 ? (
          <p className="mt-2 text-body-md text-on-surface-variant">当前没有待审核课程。</p>
        ) : (
          <div className="mt-stack-sm grid grid-cols-1 gap-stack-md sm:grid-cols-2">
            {pendingCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => onApprove(course.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-secondary-container px-3 py-2 text-label-md font-medium text-on-secondary-container transition-colors hover:opacity-90"
                    >
                      <Check className="size-4" aria-hidden="true" />
                      审核通过
                    </button>
                    <button
                      type="button"
                      onClick={() => onReject(course.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-error-container px-3 py-2 text-label-md font-medium text-on-error-container transition-colors hover:opacity-90"
                    >
                      <X className="size-4" aria-hidden="true" />
                      驳回
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </div>

      {approvedCourses.length > 0 && (
        <div>
          <h3 className="text-headline-md font-heading text-on-surface">已上架</h3>
          <div className="mt-stack-sm grid grid-cols-1 gap-stack-md sm:grid-cols-2">
            {approvedCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
