import { SearchX } from "lucide-react";

export function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center gap-2 rounded-lg border border-dashed border-outline-variant py-stack-lg text-center">
      <SearchX className="size-8 text-on-surface-variant" aria-hidden="true" />
      <p className="text-body-md text-on-surface-variant">
        没有找到匹配的课程，换个关键词或难度试试。
      </p>
    </div>
  );
}
