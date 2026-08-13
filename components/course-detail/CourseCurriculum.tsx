"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CourseCurriculumItem } from "@/lib/mock/courseDetails";

export function CourseCurriculum({ items }: { items: CourseCurriculumItem[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <section className="flex flex-col gap-stack-sm">
      <h2 className="font-heading text-headline-md text-on-surface">课程大纲</h2>
      <ul className="flex flex-col gap-stack-sm">
        {items.map((item) => {
          const isOpen = expanded.has(item.id);
          return (
            <li
              key={item.id}
              className="rounded-lg border border-outline-variant bg-surface-container"
            >
              <button
                type="button"
                onClick={() => toggle(item.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-4 px-4 py-3 text-left"
              >
                <span className="font-heading text-headline-md text-on-surface-variant/60">
                  {String(item.order).padStart(2, "0")}
                </span>
                <span className="flex-1 text-body-lg text-on-surface">{item.title}</span>
                <ChevronDown
                  className={`size-5 shrink-0 text-on-surface-variant transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {isOpen ? (
                <p className="px-4 pb-4 pl-[3.25rem] text-body-md text-on-surface-variant">
                  {item.summary}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
