import { Award } from "lucide-react";
import Link from "next/link";

export function CompletionBanner() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-secondary bg-secondary-container p-stack-lg text-center">
      <Award className="size-8 text-on-secondary-container" aria-hidden="true" />
      <div>
        <h2 className="font-heading text-headline-md text-on-secondary-container">
          恭喜完成课程！
        </h2>
        <p className="mt-1 text-body-md text-on-secondary-container">
          你的 NFT 结业证书正在 Sepolia 测试网铸造中，完成后可在个人中心查看。
        </p>
      </div>
      <Link
        href="/profile"
        className="rounded-md bg-primary-container px-6 py-3 text-body-md font-medium text-on-primary-container transition-colors hover:opacity-90"
      >
        前往个人中心
      </Link>
    </div>
  );
}
