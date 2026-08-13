import { Info } from "lucide-react";

export function DemoModeBanner() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-outline-variant bg-surface-container px-4 py-2 text-label-md text-on-surface-variant">
      <Info className="size-4 shrink-0 text-tertiary" aria-hidden="true" />
      演示模式：仅 Owner 可操作，当前未接入真实钱包与链上权限校验，此页面展示 Owner 视角的完整功能。
    </div>
  );
}
