"use client";

import Link from "next/link";
import { AlertTriangle, Check, Loader2, ShieldCheck, WifiOff } from "lucide-react";
import { useWallet } from "@/lib/wallet/useWallet";
import { usePurchaseFlow } from "@/lib/purchase/usePurchaseFlow";
import { useFaucetClaim } from "@/lib/purchase/useFaucetClaim";
import { TARGET_CHAIN } from "@/lib/contracts/chain";
import { TwoPhaseTxButton } from "./TwoPhaseTxButton";

const BENEFITS = ["完整视频访问", "编码练习", "链上证书（SBT）", "社区访问"];

function truncateHash(hash: string) {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

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
  const wallet = useWallet();
  const {
    state,
    approve,
    buy,
    approveError,
    buyError,
    readError,
    lastApproveTxHash,
    lastBuyTxHash,
    purchaseRecord,
  } = usePurchaseFlow(courseId, courseName, priceYD);
  const faucet = useFaucetClaim();

  async function handleFaucetClaim() {
    const success = await faucet.claim();
    if (success) {
      await wallet.refetchYdBalance();
    }
  }

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
          <div className="flex flex-col gap-2">
            <Link
              href={`/learn/${courseId}`}
              className="flex items-center justify-center rounded-md bg-secondary-container px-4 py-3 text-body-md font-medium text-on-secondary-container transition-colors hover:opacity-90"
            >
              开始学习
            </Link>
            {/* 展示链上真实购买信息（requirements.md：课程详情通过
                purchaseOf(courseId, student) 展示实际支付价格与购买时间），
                不是课程 fixture 里的展示价——理论上两者应该相等，但价格来源
                必须以链上为准（Codex Review 结构化复核抓到的 P1）。 */}
            {purchaseRecord && (
              <p className="text-label-md font-mono text-on-surface-variant">
                实付 {purchaseRecord.pricePaidYD} YD · 购买时间{" "}
                {new Date(purchaseRecord.purchasedAt).toLocaleString("zh-CN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}
            {/* 只有本次会话内完成的购买才有交易哈希可展示（design.md「购买记录」：
                链上 Purchase 结构不存哈希，历史交易查询不在本 feature 范围）；
                历史购买（刷新页面后）不显示这一行，不是遗漏。授权交易哈希也要
                一并展示——之前只渲染了 lastBuyTxHash，购买成功后本次会话刚看到
                的授权哈希就消失了，不满足 F-004「每一步链上操作都要展示交易
                哈希」（Codex Review 结构化复核第五轮抓到的 P2）。 */}
            {lastApproveTxHash && (
              <p
                className="truncate text-label-md font-mono text-on-surface-variant"
                title={lastApproveTxHash}
              >
                授权交易：{truncateHash(lastApproveTxHash)}
              </p>
            )}
            {lastBuyTxHash && (
              <p
                className="truncate text-label-md font-mono text-on-surface-variant"
                title={lastBuyTxHash}
              >
                购买交易：{truncateHash(lastBuyTxHash)}
              </p>
            )}
            {/* 购买确认后 buy() 内部会调用 wallet.refetchYdBalance() 刷新头部
                余额，这次刷新是独立的 RPC 调用，可能单独失败——购买状态已经是
                purchased，但之前只在 insufficient-balance 分支展示
                wallet.balanceError，购买成功后这个失败会被静默吞掉，用户看不到
                任何提示，头部余额停留在购买前的旧值（Codex Review 结构化复核
                第五轮抓到的 P2）。 */}
            {wallet.balanceError && (
              <p className="text-label-md text-error">余额刷新失败：{wallet.balanceError}</p>
            )}
          </div>
        ) : state === "wallet-disconnected" ? (
          <button
            type="button"
            onClick={wallet.login}
            disabled={wallet.loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary-container px-4 py-3 text-body-md font-medium text-on-primary-container transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {wallet.loading && <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />}
            {wallet.loading ? "加载中..." : "登录"}
          </button>
        ) : state === "wrong-network" ? (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-body-md text-error">
              <WifiOff className="size-4 shrink-0" aria-hidden="true" />
              请切换到 {TARGET_CHAIN.name} 网络
            </p>
            <button
              type="button"
              onClick={() => wallet.switchToTargetChain()}
              disabled={wallet.switchingNetwork}
              className="flex items-center justify-center gap-2 rounded-md bg-primary-container px-4 py-3 text-body-md font-medium text-on-primary-container transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {wallet.switchingNetwork && (
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
              )}
              {wallet.switchingNetwork ? "切换中..." : `切换到 ${TARGET_CHAIN.name}`}
            </button>
          </div>
        ) : state === "insufficient-balance" ? (
          <div className="flex flex-col gap-2">
            <p className="text-body-md text-error">
              YD 余额不足（当前 {wallet.ydBalance} YD，需要 {requiredBalanceYD} YD）
            </p>
            <button
              type="button"
              onClick={handleFaucetClaim}
              disabled={faucet.disabled || faucet.status === "signing" || faucet.status === "pending"}
              className="flex items-center justify-center gap-2 rounded-md bg-primary-container px-4 py-3 text-body-md font-medium text-on-primary-container transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {(faucet.status === "signing" || faucet.status === "pending") && (
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
              )}
              {faucet.status === "signing"
                ? "等待签名..."
                : faucet.status === "pending"
                  ? "等待链上确认..."
                  : "从 Faucet 领取 YD"}
            </button>
            {faucet.error && <p className="text-label-md text-error">{faucet.error}</p>}
            {/* Faucet 交易成功后余额刷新（refetchYdBalance）是独立的一次 RPC
                调用，可能单独失败——之前失败会被静默吞掉，用户只能靠整页刷新
                恢复，误以为余额一直没到账（Codex Review 结构化复核第四轮抓到
                的 P2）。领取本身的错误用 faucet.error 展示，这里展示的是刷新
                余额这一步单独的失败原因。 */}
            {wallet.balanceError && (
              <p className="text-label-md text-error">余额刷新失败：{wallet.balanceError}</p>
            )}
          </div>
        ) : state === "loading" ? (
          <div className="flex items-center justify-center gap-2 rounded-md bg-surface-container-high px-4 py-3 text-body-md text-on-surface-variant">
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
            读取链上状态...
          </div>
        ) : state === "read-error" ? (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-body-md text-error">
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              {/* state === "read-error" 现在由 usePurchaseFlow 的 readError（allowance/
                  hasPurchased 读取失败）或 wallet.balanceError（余额读取失败）任一
                  触发（Codex Review 结构化复核最后一轮抓到的 P2 修复），两者都要能
                  展示出具体原因，不能只覆盖前者。 */}
              {readError ?? wallet.balanceError ?? "读取链上状态失败，请刷新重试"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <TwoPhaseTxButton state={state} priceYD={priceYD} onApprove={approve} onBuy={buy} />
            {approveError && <p className="text-label-md text-error">{approveError}</p>}
            {buyError && <p className="text-label-md text-error">{buyError}</p>}
            {/* 每一步链上操作都要展示交易哈希（requirements.md F-004/PRD 11.2），
                不只是最终的购买成功——授权阶段完成后哈希也要能看到，即使还没
                进入购买阶段。 */}
            {lastApproveTxHash && (
              <p
                className="truncate text-label-md font-mono text-on-surface-variant"
                title={lastApproveTxHash}
              >
                授权交易：{truncateHash(lastApproveTxHash)}
              </p>
            )}
            {lastBuyTxHash && (
              <p
                className="truncate text-label-md font-mono text-on-surface-variant"
                title={lastBuyTxHash}
              >
                购买交易：{truncateHash(lastBuyTxHash)}
              </p>
            )}
          </div>
        )}
      </div>

      <p className="mt-stack-sm flex items-center gap-2 text-code-sm font-mono text-on-surface-variant">
        <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
        Secured by {TARGET_CHAIN.name} Smart Contracts
      </p>
    </div>
  );
}
