import { Check, Lock, Play } from "lucide-react";
import type { Lesson } from "@/lib/mock/types";

interface LessonListProps {
  /** 调用方需保证已按 order 升序排列（LearningCenter 用 useMemo 排好后传入）。 */
  lessons: Lesson[];
  completedCount: number;
}

type LessonState = "completed" | "current" | "locked";

function getLessonState(order: number, completedCount: number): LessonState {
  if (order <= completedCount) return "completed";
  if (order === completedCount + 1) return "current";
  return "locked";
}

const STATE_CLASS: Record<LessonState, string> = {
  completed: "border-outline-variant",
  current: "border-primary bg-primary-container/10",
  locked: "border-outline-variant opacity-60",
};

export function LessonList({ lessons, completedCount }: LessonListProps) {
  return (
    <ol className="mt-stack-sm flex flex-col gap-2">
      {lessons.map((lesson) => {
        const state = getLessonState(lesson.order, completedCount);
        return (
          <li
            key={lesson.id}
            className={`flex items-center gap-3 rounded-md border p-3 ${STATE_CLASS[state]}`}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-container-high">
              {state === "completed" && (
                <Check className="size-4 text-secondary" aria-hidden="true" />
              )}
              {state === "current" && <Play className="size-3.5 text-primary" aria-hidden="true" />}
              {state === "locked" && (
                <Lock className="size-3.5 text-on-surface-variant" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-md text-on-surface">{lesson.title}</p>
              <p className="text-label-md font-mono text-on-surface-variant">
                {lesson.durationMinutes} mins
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
