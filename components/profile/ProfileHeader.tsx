"use client";

import { Pencil, Wallet } from "lucide-react";
import { mockCurrentUser } from "@/lib/mock/fixtures";
import { useWallet } from "@/lib/wallet/useWallet";

const ROLE_LABEL: Record<string, string> = {
  student: "学生",
  teacher: "老师",
  owner: "管理员",
};

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface ProfileHeaderProps {
  username: string;
  onEditUsername: () => void;
}

export function ProfileHeader({ username, onEditUsername }: ProfileHeaderProps) {
  // address/ydBalance 读自 useWallet()（而非固定 fixture），ydBalance 现在是
  // `YDToken.balanceOf(address)` 的真实链上余额（见 lib/purchase/useOnchainBalance.ts），
  // 在课程详情页 Faucet 领取/购买后调用 wallet.refetchYdBalance() 刷新，个人中心头部
  // 余额与 TopNav 等其它消费同一状态的地方保持一致。role 仍取 mockCurrentUser
  // （useWallet 未暴露该字段）。
  // address 类型是 string | null，但本组件只会在 app/profile/page.tsx 的登录门禁
  // 判定 connected 为 true 之后才被渲染，届时 address 必然非空，用 "" 兜底纯粹是
  // 满足类型检查，不代表真的会展示空地址。
  const { address, ydBalance } = useWallet();

  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border border-outline-variant bg-surface-container p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary-container font-heading text-headline-lg text-on-primary-container">
          {username.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-headline-lg text-on-surface">{username}</h1>
            <span className="rounded-full bg-secondary-container px-2 py-0.5 text-label-md text-on-secondary-container">
              {ROLE_LABEL[mockCurrentUser.role]}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-label-md text-on-surface-variant">
            <span className="font-mono">{truncateAddress(address ?? "")}</span>
            <span className="flex items-center gap-1 font-mono">
              <Wallet className="size-3.5" aria-hidden="true" />
              {ydBalance} YD
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onEditUsername}
        className="flex items-center gap-1.5 rounded-md border border-outline-variant px-4 py-2 text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container-high"
      >
        <Pencil className="size-4" aria-hidden="true" />
        修改用户名
      </button>
    </div>
  );
}
