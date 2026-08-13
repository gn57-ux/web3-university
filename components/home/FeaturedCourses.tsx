import Image from "next/image";
import Link from "next/link";
import { COURSE_LEVEL_BADGE_CLASS, COURSE_LEVEL_LABEL } from "@/lib/mock/courseLevel";
import { mockCourses } from "@/lib/mock/fixtures";

// 展示用的周期标签，非 Course 类型字段。courseId 与 lib/mock/fixtures.ts 的
// mockCourses 一一对应，价格/难度等权威字段均从 mockCourses 读取，避免与
// feature 3/4 出现价格漂移（Stitch 首页截图标注的 50/120 YD 与 PRD/feature 3/4
// 的规范定价不一致，此处以 mockCourses 为准）。
const FEATURED_COURSE_IDS: { id: string; durationLabel: string }[] = [
  { id: "solidity-101", durationLabel: "4 周" },
  { id: "defi-uniswap-practical", durationLabel: "8 周" },
];

export function FeaturedCourses() {
  const featured = FEATURED_COURSE_IDS.map(({ id, durationLabel }) => {
    const course = mockCourses.find((c) => c.id === id);
    return course ? { ...course, durationLabel } : null;
  }).filter((course): course is NonNullable<typeof course> => course !== null);

  return (
    <section className="container-app py-stack-lg">
      <h2 className="font-heading text-headline-lg text-on-surface">精选课程</h2>
      <div className="mt-stack-md grid grid-cols-1 gap-stack-md sm:grid-cols-2">
        {featured.map((course) => (
          <Link
            key={course.id}
            href={`/courses/${course.id}`}
            className="group flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container transition-colors hover:border-primary"
          >
            <div className="relative aspect-video w-full bg-surface-container-high">
              <Image src={course.coverUrl} alt={course.title} fill className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <span
                className={`w-fit rounded-full px-3 py-1 font-mono text-label-md ${COURSE_LEVEL_BADGE_CLASS[course.level]}`}
              >
                {COURSE_LEVEL_LABEL[course.level]}
              </span>
              <h3 className="font-heading text-headline-md text-on-surface group-hover:text-primary">
                {course.title}
              </h3>
              <p className="text-label-md font-mono text-on-surface-variant">
                {course.durationLabel}
              </p>
              <div className="mt-auto pt-2">
                <span className="font-heading text-headline-md text-tertiary">
                  {course.priceYD} YD
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
