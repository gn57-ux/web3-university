import { Lock } from "lucide-react";
import Link from "next/link";

interface PurchaseRequiredGateProps {
  courseId: string;
  courseTitle: string;
}

export function PurchaseRequiredGate({ courseId, courseTitle }: PurchaseRequiredGateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-outline-variant bg-surface-container p-stack-lg text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-container-high">
        <Lock className="size-6 text-on-surface-variant" aria-hidden="true" />
      </span>
      <div>
        <h1 className="font-heading text-headline-lg text-on-surface">请先购买本课程</h1>
        <p className="mt-stack-sm max-w-md text-body-md text-on-surface-variant">
          购买「{courseTitle}」后即可解锁完整视频、章节进度与评论区。
        </p>
      </div>
      <Link
        href={`/courses/${courseId}`}
        className="rounded-md bg-primary-container px-6 py-3 text-body-md font-medium text-on-primary-container transition-colors hover:opacity-90"
      >
        前往课程详情购买
      </Link>
    </div>
  );
}
