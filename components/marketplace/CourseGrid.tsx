import type { Course } from "@/lib/mock/types";
import { CourseCard } from "./CourseCard";
import { CourseCardSkeleton } from "./CourseCardSkeleton";
import { EmptyState } from "./EmptyState";

interface CourseGridProps {
  courses: Course[];
  loading: boolean;
}

export function CourseGrid({ courses, loading }: CourseGridProps) {
  return (
    <div className="mt-stack-md grid grid-cols-1 gap-stack-md sm:grid-cols-2 lg:grid-cols-3">
      {loading ? (
        Array.from({ length: 3 }).map((_, index) => <CourseCardSkeleton key={index} />)
      ) : courses.length === 0 ? (
        <EmptyState />
      ) : (
        courses.map((course) => <CourseCard key={course.id} course={course} />)
      )}
    </div>
  );
}
