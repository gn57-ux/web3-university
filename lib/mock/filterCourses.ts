import type { Course, CourseLevel } from "./types";

export type CourseLevelFilter = CourseLevel | "all";

export function filterCourses(
  courses: Course[],
  query: string,
  level: CourseLevelFilter
): Course[] {
  const normalizedQuery = query.trim().toLowerCase();

  return courses.filter((course) => {
    const matchesLevel = level === "all" || course.level === level;
    const matchesQuery =
      normalizedQuery === "" ||
      course.title.toLowerCase().includes(normalizedQuery) ||
      course.teacher.toLowerCase().includes(normalizedQuery);
    return matchesLevel && matchesQuery;
  });
}
