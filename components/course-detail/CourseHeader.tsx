import { COURSE_LEVEL_BADGE_CLASS, COURSE_LEVEL_LABEL } from "@/lib/mock/courseLevel";
import type { CourseDetail } from "@/lib/mock/courseDetails";

export function CourseHeader({ course }: { course: CourseDetail }) {
  return (
    <div className="flex flex-col gap-stack-sm">
      <span
        className={`w-fit rounded-full px-3 py-1 font-mono text-label-md ${COURSE_LEVEL_BADGE_CLASS[course.level]}`}
      >
        {COURSE_LEVEL_LABEL[course.level]}
      </span>
      <h1 className="font-heading text-headline-lg text-on-surface">{course.title}</h1>
      <p className="text-body-md text-on-surface-variant">讲师：{course.teacher}</p>
      <p className="text-body-lg text-on-surface-variant">{course.description}</p>
    </div>
  );
}
