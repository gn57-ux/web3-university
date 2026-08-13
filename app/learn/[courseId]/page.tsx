import { notFound } from "next/navigation";
import { LearningCenter } from "@/components/learning-center/LearningCenter";
import { getCourseDetail } from "@/lib/mock/courseDetails";
import { mockLessons } from "@/lib/mock/fixtures";

export default async function LearningCenterPage(props: PageProps<"/learn/[courseId]">) {
  const { courseId } = await props.params;
  const course = getCourseDetail(courseId);

  if (!course) {
    notFound();
  }

  const lessons = mockLessons.filter((lesson) => lesson.courseId === courseId);

  return (
    <LearningCenter key={courseId} courseId={courseId} courseTitle={course.title} lessons={lessons} />
  );
}
