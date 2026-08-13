"use client";

import { Search } from "lucide-react";
import { COURSE_LEVEL_LABEL } from "@/lib/mock/courseLevel";
import type { CourseLevelFilter } from "@/lib/mock/filterCourses";

// Stitch 原稿难度筛选文案为「入门/进阶/专家」，但课程卡难度徽标（COURSE_LEVEL_LABEL）
// 全站统一用「初级/中级/高级」（feature 2 精选课程、feature 4 课程详情已在用）。
// 沿用同一套术语，避免同一门课程在筛选 Tab 与卡片徽标上出现两种不同难度措辞。
const LEVEL_TABS: { value: CourseLevelFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "beginner", label: COURSE_LEVEL_LABEL.beginner },
  { value: "intermediate", label: COURSE_LEVEL_LABEL.intermediate },
  { value: "expert", label: COURSE_LEVEL_LABEL.expert },
];

interface FilterBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  level: CourseLevelFilter;
  onLevelChange: (value: CourseLevelFilter) => void;
}

export function FilterBar({ query, onQueryChange, level, onLevelChange }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索课程..."
          aria-label="搜索课程"
          className="w-full rounded-md border border-outline-variant bg-surface-container py-2 pl-9 pr-3 text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div
        role="tablist"
        aria-label="按难度筛选课程"
        className="flex flex-wrap gap-1 rounded-md border border-outline-variant bg-surface-container p-1"
      >
        {LEVEL_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={level === tab.value}
            onClick={() => onLevelChange(tab.value)}
            className={`rounded-md px-3 py-1.5 text-label-md font-medium transition-colors ${
              level === tab.value
                ? "bg-primary-container text-on-primary-container"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
