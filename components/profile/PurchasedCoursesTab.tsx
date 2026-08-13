"use client";

import Image from "next/image";
import Link from "next/link";
import { mockCourses, mockTransactions } from "@/lib/mock/fixtures";
import { useProfilePurchases } from "@/lib/purchase/useProfilePurchases";

export function PurchasedCoursesTab() {
  const purchases = useProfilePurchases();
  // useProfilePurchases 在没有真实购买记录时回退返回 mockTransactions 这个具体的模块
  // 引用（见该 hook 的实现），可以直接用引用相等判断当前展示的是不是回退数据——
  // 回退数据不代表真实购买，"继续学习"按钮不能指向会被购课门禁拦截的 /learn/{id}，
  // 改为跳转课程详情页，避免"个人中心显示已购、点进去却提示未购买"的自相矛盾。
  const isFallback = purchases === mockTransactions;

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
                href={isFallback ? `/courses/${course.id}` : `/learn/${course.id}`}
                className="mt-auto w-fit rounded-md bg-primary-container px-4 py-2 text-body-md font-medium text-on-primary-container transition-colors hover:opacity-90"
              >
                {isFallback ? "查看课程详情" : "继续学习"}
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
