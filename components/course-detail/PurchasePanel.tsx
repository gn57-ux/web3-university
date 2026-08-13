"use client";

import Link from "next/link";
import { Check, ShieldCheck, WifiOff } from "lucide-react";
import { useMockWallet } from "@/lib/wallet/useMockWallet";
import { usePurchaseFlow } from "@/lib/purchase/usePurchaseFlow";
import { TwoPhaseTxButton } from "./TwoPhaseTxButton";

const BENEFITS = ["完整视频访问", "编码练习", "链上证书（SBT）", "社区访问"];

interface PurchasePanelProps {
  courseId: string;
  courseName: string;
  priceYD: number;
  requiredBalanceYD: number;
}

export function PurchasePanel({
  courseId,
  courseName,
  priceYD,
  requiredBalanceYD,
}: PurchasePanelProps) {
  const wallet = useMockWallet();
  const { state, approve, buy } = usePurchaseFlow(
    courseId,
    courseName,
    priceYD,
    requiredBalanceYD
  );

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container p-6">
      <div className="flex items-baseline justify-between">
        <span className="font-heading text-headline-md text-tertiary">{priceYD} YD</span>
        <span className="text-label-md font-mono text-on-surface-variant">永久访问</span>
      </div>
      <p className="mt-1 text-label-md font-mono text-on-surface-variant">
        需要钱包余额 ≥ {requiredBalanceYD} YD
      </p>

      <ul className="mt-stack-md flex flex-col gap-2">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-center gap-2 text-body-md text-on-surface">
            <Check className="size-4 shrink-0 text-secondary" aria-hidden="true" />
            {benefit}
          </li>
        ))}
      </ul>

      <div className="mt-stack-md">
        {state === "purchased" ? (
          <Link
            href={`/learn/${courseId}`}
            className="flex items-center justify-center rounded-md bg-secondary-container px-4 py-3 text-body-md font-medium text-on-secondary-container transition-colors hover:opacity-90"
          >
            开始学习
          </Link>
        ) : state === "wallet-disconnected" ? (
          <button
            type="button"
            onClick={wallet.connect}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary-container px-4 py-3 text-body-md font-medium text-on-primary-container transition-colors hover:opacity-90"
          >
            连接钱包
          </button>
        ) : state === "wrong-network" ? (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-body-md text-error">
              <WifiOff className="size-4 shrink-0" aria-hidden="true" />
              请切换到 Sepolia 网络
            </p>
            <button
              type="button"
              onClick={() => wallet.setNetwork("sepolia")}
              className="rounded-md bg-primary-container px-4 py-3 text-body-md font-medium text-on-primary-container transition-colors hover:opacity-90"
            >
              切换到 Sepolia
            </button>
          </div>
        ) : state === "insufficient-balance" ? (
          <div className="flex flex-col gap-2">
            <p className="text-body-md text-error">
              YD 余额不足（当前 {wallet.ydBalance} YD，需要 {requiredBalanceYD} YD）
            </p>
            <button
              type="button"
              onClick={() => wallet.setYdBalance(requiredBalanceYD)}
              className="rounded-md bg-primary-container px-4 py-3 text-body-md font-medium text-on-primary-container transition-colors hover:opacity-90"
            >
              Mock 领取 {requiredBalanceYD} YD（Faucet）
            </button>
          </div>
        ) : (
          <TwoPhaseTxButton state={state} priceYD={priceYD} onApprove={approve} onBuy={buy} />
        )}
      </div>

      <p className="mt-stack-sm flex items-center gap-2 text-code-sm font-mono text-on-surface-variant">
        <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
        Secured by Sepolia Smart Contracts
      </p>
    </div>
  );
}
