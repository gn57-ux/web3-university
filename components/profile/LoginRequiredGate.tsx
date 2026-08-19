import { Lock } from "lucide-react";

interface LoginRequiredGateProps {
  loading: boolean;
  onLogin: () => void;
}

export function LoginRequiredGate({ loading, onLogin }: LoginRequiredGateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-outline-variant bg-surface-container p-stack-lg text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-container-high">
        <Lock className="size-6 text-on-surface-variant" aria-hidden="true" />
      </span>
      <div>
        <h1 className="font-heading text-headline-lg text-on-surface">请先登录</h1>
        <p className="mt-stack-sm max-w-md text-body-md text-on-surface-variant">
          登录后即可查看你的资料、已购课程、学习进度、NFT 证书与购买记录。
        </p>
      </div>
      <button
        type="button"
        onClick={onLogin}
        disabled={loading}
        className="rounded-md bg-primary-container px-6 py-3 text-body-md font-medium text-on-primary-container transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "加载中..." : "登录"}
      </button>
    </div>
  );
}
