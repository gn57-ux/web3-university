"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@/lib/wallet/useWallet";
import { getOnchainCourseId } from "@/lib/contracts/courseIdMap";
import type { TxStatus } from "@/lib/contracts/txError";

export interface CompletionConfirmationState {
  /** 复用 [[14.contract-client-foundation]] 的 `TxStatus`，但这里没有钱包签名这一步——
   *  `signing` 档在本 Hook 里语义是"请求已发出、服务端正在代表受信任提交者处理
   *  （含链上确认），等待响应"，不是"等待用户在钱包里签名"，消费方文案需要区分
   *  清楚（design.md 模块 2）。`/api/complete-course` 内部已经把签名、广播、
   *  `waitForTransactionReceipt` 全部做完才返回响应，客户端不会看到独立的
   *  "已提交待确认"中间态，所以不使用 `pending`。 */
  status: TxStatus;
  error: string | null;
  /** 未登录/嵌入式钱包地址不可用时为 true，消费方应禁用确认按钮。 */
  disabled: boolean;
  /** 返回本次确认是否成功——与 useFaucetClaim.ts 同样的理由：不能在
   *  `await confirm()` 之后直接读 `status`，那是调用前的旧值（stale closure），
   *  必须靠返回值传递结果。 */
  confirm: () => Promise<boolean>;
}

/**
 * 触发 `/api/complete-course`，代表当前登录学生请求受信任提交者确认某课程
 * 完成（服务端会调用 `DemoCompletionOracle.confirmCompletion` → 转发
 * `Web3University.markCompleted` → 自动铸造证书）。
 */
export function useCompletionConfirmation(courseId: string): CompletionConfirmationState {
  const wallet = useWallet();
  const [status, setStatus] = useState<TxStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // 与 useFaucetClaim.ts/usePurchaseFlow.ts 同一套账户切换竞态防护：请求发出后
  // 等待服务端响应期间账户可能切换，完成时必须重新校验发起账户仍是当前账户，
  // 不一致就丢弃这次结果，不能把账户 A 的确认结果写进已经属于账户 B 的会话。
  const latestAddressRef = useRef(wallet.address);
  useEffect(() => {
    latestAddressRef.current = wallet.address;
  }, [wallet.address]);

  // 账户/课程切换时清空上一次的确认会话状态。
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setStatus("idle");
        setError(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [wallet.address, courseId]);

  const confirm = useCallback(async (): Promise<boolean> => {
    if (!wallet.address) return false;
    const startAddress = wallet.address;
    const isStale = () => latestAddressRef.current !== startAddress;

    let onchainCourseId: bigint;
    try {
      onchainCourseId = getOnchainCourseId(courseId);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "未知课程");
      return false;
    }

    setStatus("signing");
    setError(null);
    try {
      const response = await fetch("/api/complete-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student: startAddress, courseId: onchainCourseId.toString() }),
      });
      const result = (await response.json()) as { ok: boolean; message?: string };
      if (isStale()) return false;
      if (!response.ok || !result.ok) {
        setStatus("error");
        setError(result.message ?? "确认完成失败，请重试");
        return false;
      }
      setStatus("success");
      return true;
    } catch (e) {
      if (isStale()) return false;
      setStatus("error");
      setError(e instanceof Error ? e.message : "网络请求失败，请检查连接后重试");
      return false;
    }
  }, [wallet.address, courseId]);

  return { status, error, disabled: !wallet.address, confirm };
}
