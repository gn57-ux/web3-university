"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Breadcrumb } from "./Breadcrumb";
import { CodeSnippet } from "./CodeSnippet";
import { CommentSection } from "./CommentSection";
import { CompletionBanner } from "./CompletionBanner";
import { LessonList } from "./LessonList";
import { MockVideoPlayer } from "./MockVideoPlayer";
import { ProgressBar } from "./ProgressBar";
import { PurchaseRequiredGate } from "./PurchaseRequiredGate";
import { mockComments } from "@/lib/mock/comments";
import { getPurchases, subscribePurchases } from "@/lib/mock/purchaseStore";
import type { Lesson } from "@/lib/mock/types";

interface LearningCenterProps {
  courseId: string;
  courseTitle: string;
  lessons: Lesson[];
}

const INITIAL_COMPLETED = 3;

export function LearningCenter({ courseId, courseTitle, lessons }: LearningCenterProps) {
  // 购课门禁复用 feature 4 已验证的 useSyncExternalStore 模式（见 specs/LESSONS.md
  // 2026-08-12 Feature 4 条目）：getServerSnapshot 恒返回 false 保证不产生 hydration
  // mismatch，无需额外的"恢复中"骨架态。
  const isPurchased = useSyncExternalStore(
    subscribePurchases,
    () => getPurchases().some((record) => record.courseId === courseId),
    () => false
  );

  const sortedLessons = useMemo(() => [...lessons].sort((a, b) => a.order - b.order), [lessons]);
  const [completedCount, setCompletedCount] = useState(() =>
    Math.min(INITIAL_COMPLETED, sortedLessons.length)
  );

  if (!isPurchased) {
    return (
      <div className="container-app flex flex-col gap-stack-md py-stack-lg">
        <Breadcrumb currentLabel={courseTitle} />
        <PurchaseRequiredGate courseId={courseId} courseTitle={courseTitle} />
      </div>
    );
  }

  const total = sortedLessons.length;
  const isComplete = completedCount >= total;
  const currentLesson = isComplete ? null : sortedLessons[completedCount];
  const percent = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  function markCurrentLessonComplete() {
    setCompletedCount((current) => Math.min(current + 1, total));
  }

  return (
    <div className="container-app py-stack-lg">
      <Breadcrumb currentLabel={currentLesson?.title ?? courseTitle} />
      <h1 className="mt-stack-sm font-heading text-headline-lg text-on-surface">
        {currentLesson?.title ?? courseTitle}
      </h1>

      <div className="mt-stack-md grid grid-cols-1 gap-stack-md lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-stack-md">
          {isComplete || !currentLesson ? (
            <CompletionBanner />
          ) : (
            <>
              <MockVideoPlayer
                key={currentLesson.id}
                title={currentLesson.title}
                durationMinutes={currentLesson.durationMinutes}
              />
              <CodeSnippet />
            </>
          )}
          <CommentSection initialComments={mockComments} />
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-headline-md text-on-surface">课程进度</h2>
            <span className="rounded-full bg-secondary-container px-2 py-0.5 font-mono text-label-md text-on-secondary-container">
              {percent}%
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar percent={percent} />
          </div>
          <p className="mt-1 text-label-md text-on-surface-variant">
            {completedCount} / {total} 个模块已完成
          </p>

          <LessonList lessons={sortedLessons} completedCount={completedCount} />

          {!isComplete && (
            <button
              type="button"
              onClick={markCurrentLessonComplete}
              className="mt-stack-sm w-full rounded-md border border-outline-variant py-2 text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container-high"
            >
              标记本章完成（演示）
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
