import { getCourseDetail } from "@/lib/mock/courseDetails";
import { notFound } from "next/navigation";

export default async function LearningCenterPage(props: PageProps<"/learn/[courseId]">) {
  const { courseId } = await props.params;
  const course = getCourseDetail(courseId);

  if (!course) {
    notFound();
  }

  return (
    <div className="container-app py-stack-lg">
      <h1 className="font-heading text-headline-lg text-on-surface">{course.title}</h1>
      <p className="mt-stack-sm text-body-md text-on-surface-variant">
        学习中心页面建设中，敬请期待。
      </p>
    </div>
  );
}
