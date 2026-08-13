import { notFound } from "next/navigation";
import { getCourseDetail } from "@/lib/mock/courseDetails";
import { CourseHeader } from "@/components/course-detail/CourseHeader";
import { CourseCurriculum } from "@/components/course-detail/CourseCurriculum";
import { CourseReviews } from "@/components/course-detail/CourseReviews";
import { PurchasePanel } from "@/components/course-detail/PurchasePanel";

export default async function CourseDetailPage(props: PageProps<"/courses/[courseId]">) {
  const { courseId } = await props.params;
  const course = getCourseDetail(courseId);

  if (!course) {
    notFound();
  }

  return (
    <div className="container-app grid grid-cols-1 gap-stack-lg py-stack-lg lg:grid-cols-[1fr_360px]">
      <div className="lg:col-start-1 lg:row-start-1">
        <CourseHeader course={course} />
      </div>

      <div className="lg:col-start-2 lg:row-start-1 lg:row-span-3 lg:sticky lg:top-24 lg:self-start">
        <PurchasePanel
          courseId={course.id}
          courseName={course.title}
          priceYD={course.priceYD}
          requiredBalanceYD={course.requiredBalanceYD}
        />
      </div>

      <div className="lg:col-start-1 lg:row-start-2">
        <CourseCurriculum items={course.curriculum} />
      </div>

      <div className="lg:col-start-1 lg:row-start-3">
        <CourseReviews reviews={course.reviews} />
      </div>
    </div>
  );
}
