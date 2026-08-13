"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useMockWallet } from "@/lib/wallet/useMockWallet";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function Hero() {
  const { connected, address, connect } = useMockWallet();

  return (
    <section className="container-app flex flex-col items-center gap-stack-md py-stack-lg text-center">
      <h1 className="max-w-3xl font-heading text-display text-on-surface">
        学习 Web3，拥有你的学习成果
      </h1>
      {/* 中英文标题（F-001）：Stitch 原稿英文副标题第一句提升为标题级样式，与中文主标题
          构成双语标题组合，其余英文文案作为下方定位说明保留，均为设计稿原文，未新造文案。 */}
      <h2 className="max-w-2xl font-heading text-headline-md text-on-surface-variant">
        Join the premier digital native university.
      </h2>
      <p className="max-w-2xl text-body-lg text-on-surface-variant">
        Master blockchain development, earn verifiable on-chain credentials, and build your
        decentralized future.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/courses"
          className="rounded-md bg-primary-container px-6 py-3 text-body-md font-medium text-on-primary-container transition-colors hover:opacity-90"
        >
          浏览课程
        </Link>
        {connected ? (
          <span
            className="flex items-center justify-center gap-2 rounded-md border border-secondary bg-secondary-container px-6 py-3 font-mono text-body-md font-medium text-on-secondary-container"
            aria-live="polite"
          >
            <Check className="size-4 shrink-0" aria-hidden="true" />
            已连接 {truncateAddress(address)}
          </span>
        ) : (
          <button
            type="button"
            onClick={connect}
            className="rounded-md border border-outline-variant px-6 py-3 text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container"
          >
            连接钱包
          </button>
        )}
      </div>
    </section>
  );
}
