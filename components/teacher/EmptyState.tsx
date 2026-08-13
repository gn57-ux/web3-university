import { BookPlus } from "lucide-react";

interface EmptyStateProps {
  onSubmitNew: () => void;
}

export function EmptyState({ onSubmitNew }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-outline-variant py-stack-lg text-center">
      <BookPlus className="size-8 text-on-surface-variant" aria-hidden="true" />
      <p className="text-body-md text-on-surface-variant">您还没有提交任何课程。</p>
      <button
        type="button"
        onClick={onSubmitNew}
        className="rounded-md bg-primary-container px-4 py-2 text-body-md font-medium text-on-primary-container transition-colors hover:opacity-90"
      >
        提交新课程
      </button>
    </div>
  );
}
