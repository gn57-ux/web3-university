import { Coins, User, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { COURSE_LEVEL_BADGE_CLASS, COURSE_LEVEL_LABEL } from "@/lib/mock/courseLevel";
import type { Course } from "@/lib/mock/types";

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container transition-colors hover:border-primary"
    >
      <div className="relative aspect-video w-full bg-surface-container-high">
        <Image src={course.coverUrl} alt={course.title} fill className="object-cover" />
        <span
          className={`absolute right-3 top-3 rounded-full px-3 py-1 font-mono text-label-md ${COURSE_LEVEL_BADGE_CLASS[course.level]}`}
        >
          {COURSE_LEVEL_LABEL[course.level]}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-heading text-headline-md text-on-surface group-hover:text-primary">
          {course.title}
        </h3>
        <div className="flex items-center gap-1.5 text-body-md text-on-surface-variant">
          <User className="size-4 shrink-0" aria-hidden="true" />
          {course.teacher}
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="flex items-center gap-1.5 font-heading text-headline-md text-tertiary">
            <Coins className="size-4 shrink-0" aria-hidden="true" />
            {course.priceYD} YD
          </span>
          <span className="flex items-center gap-1.5 text-label-md font-mono text-on-surface-variant">
            <Users className="size-4 shrink-0" aria-hidden="true" />
            {course.enrolledCount.toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );
}
