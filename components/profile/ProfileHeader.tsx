"use client";

import { Pencil, Wallet } from "lucide-react";
import { mockCurrentUser } from "@/lib/mock/fixtures";
import { useMockWallet } from "@/lib/wallet/useMockWallet";

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
  // design.md 模块 1 要求 address/ydBalance 读自 useMockWallet()（而非固定 fixture），
  // 保证在课程详情页领取过 Mock YD（wallet.setYdBalance）后，个人中心头部余额同步更新，
  // 与 TopNav 等其它消费同一 Context 的地方保持一致。role 仍取 mockCurrentUser（
  // useMockWallet 未暴露该字段）。
  const { address, ydBalance } = useMockWallet();

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
            <span className="font-mono">{truncateAddress(address)}</span>
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
