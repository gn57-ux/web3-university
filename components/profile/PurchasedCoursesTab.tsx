"use client";

import Image from "next/image";
import Link from "next/link";
import { mockCourses } from "@/lib/mock/fixtures";
import { useProfilePurchases } from "@/lib/purchase/useProfilePurchases";

export function PurchasedCoursesTab() {
  const { purchases, loading, error } = useProfilePurchases();

  if (loading && purchases.length === 0) {
    return <p className="text-body-md text-on-surface-variant">读取链上已购课程中...</p>;
  }

  // 读取失败必须单独展示，不能被"暂无已购课程"这个正常空态掩盖——否则一次
  // RPC 抖动会让已购课程用户误以为自己什么都没买（Codex Review 结构化复核
  // 抓到的问题：初版丢弃了 useProfilePurchases() 已经暴露的 error）。
  if (error) {
    return <p className="text-body-md text-error">读取已购课程失败：{error}</p>;
  }

  if (purchases.length === 0) {
    return <p className="text-body-md text-on-surface-variant">暂无已购课程。</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-stack-md sm:grid-cols-2">
      {purchases.map((purchase) => {
        const course = mockCourses.find((c) => c.id === purchase.courseId);
        if (!course) return null;
        return (
          <div
            key={purchase.courseId}
            className="flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container"
          >
            <div className="relative aspect-video w-full bg-surface-container-high">
              <Image src={course.coverUrl} alt={course.title} fill className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <h3 className="font-heading text-headline-md text-on-surface">{course.title}</h3>
              <Link
                href={`/learn/${course.id}`}
                className="mt-auto w-fit rounded-md bg-primary-container px-4 py-2 text-body-md font-medium text-on-primary-container transition-colors hover:opacity-90"
              >
                继续学习
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
