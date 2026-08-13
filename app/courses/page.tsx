"use client";

import { useEffect, useState } from "react";
import { CourseGrid } from "@/components/marketplace/CourseGrid";
import { FilterBar } from "@/components/marketplace/FilterBar";
import { mockCourses } from "@/lib/mock/fixtures";
import { filterCourses, type CourseLevelFilter } from "@/lib/mock/filterCourses";

export default function CoursesPage() {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<CourseLevelFilter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const filtered = filterCourses(mockCourses, query, level);

  return (
    <div className="container-app py-stack-lg">
      {/* Stitch 原稿实际结构是「短标题 + 长副文案」两段（非 requirements.md F-001 摘要成的
          单句长标题），实现阶段通过 mcp__stitch__get_screen 核对原始截图确认，见
          specs/3.course-marketplace/design.md 的补充说明。 */}
      <h1 className="font-heading text-headline-lg text-on-surface">发现 Web3 的未来</h1>
      <p className="mt-stack-sm max-w-2xl text-body-lg text-on-surface-variant">
        掌握最新的区块链技术、智能合约开发和去中心化金融原理。开启您的数字主权之旅。
      </p>
      <div className="mt-stack-md">
        <FilterBar query={query} onQueryChange={setQuery} level={level} onLevelChange={setLevel} />
      </div>
      <CourseGrid courses={filtered} loading={loading} />
    </div>
  );
}
