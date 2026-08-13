"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useMockWallet } from "@/lib/wallet/useMockWallet";
import { getPurchases, recordPurchase, subscribePurchases } from "@/lib/mock/purchaseStore";

export type PurchaseState =
  | "wallet-disconnected"
  | "wrong-network"
  | "insufficient-balance"
  | "needs-approval"
  | "approving"
  | "ready-to-buy"
  | "buying"
  | "purchased";

const APPROVE_DELAY_MS = 1000;
const BUY_DELAY_MS = 1200;

export function usePurchaseFlow(
  courseId: string,
  courseName: string,
  priceYD: number,
  requiredBalanceYD: number
) {
  const wallet = useMockWallet();

  // 「是否已购买」读取自共享 Mock Store（localStorage），用 useSyncExternalStore
  // 而非「useState 初值 false + useEffect 里 setState」：
  // getServerSnapshot 恒返回 false，服务端渲染与客户端首次渲染结果一致，不产生
  // hydration mismatch；recordPurchase() 成功后 store 内部 notify 订阅者，
  // 该 Hook 会自动感知变化并重新渲染为 "purchased" 态，无需手动 setState。
  const isPurchased = useSyncExternalStore(
    subscribePurchases,
    () => getPurchases().some((record) => record.courseId === courseId),
    () => false
  );

  const [isApproved, setIsApproved] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  const approveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 授权/购买的 Mock 异步等待期间，钱包可能被断开、切换到错误网络或余额被清零
  // （例如用户在 TopNav 点击断开钱包）。setTimeout 回调里的闭包是发起操作那一刻
  // 的旧值，必须在回调触发时通过 ref 读取最新前置条件，无效则放弃本次操作，
  // 不能让一个已失效的钱包状态仍然"完成"授权/购买。
  const prereqsRef = useRef({
    connected: wallet.connected,
    network: wallet.network,
    ydBalance: wallet.ydBalance,
    requiredBalanceYD,
  });
  useEffect(() => {
    prereqsRef.current = {
      connected: wallet.connected,
      network: wallet.network,
      ydBalance: wallet.ydBalance,
      requiredBalanceYD,
    };
  }, [wallet.connected, wallet.network, wallet.ydBalance, requiredBalanceYD]);

  function prereqsStillValid() {
    const p = prereqsRef.current;
    return p.connected && p.network === "sepolia" && p.ydBalance >= p.requiredBalanceYD;
  }

  useEffect(() => {
    return () => {
      if (approveTimer.current) clearTimeout(approveTimer.current);
      if (buyTimer.current) clearTimeout(buyTimer.current);
    };
  }, []);

  const state: PurchaseState = useMemo(() => {
    if (isPurchased) return "purchased";
    if (!wallet.connected) return "wallet-disconnected";
    if (wallet.network !== "sepolia") return "wrong-network";
    if (wallet.ydBalance < requiredBalanceYD) return "insufficient-balance";
    if (isBuying) return "buying";
    if (isApproved) return "ready-to-buy";
    if (isApproving) return "approving";
    return "needs-approval";
  }, [
    isPurchased,
    wallet.connected,
    wallet.network,
    wallet.ydBalance,
    requiredBalanceYD,
    isBuying,
    isApproved,
    isApproving,
  ]);

  const approve = useCallback(() => {
    if (state !== "needs-approval") return;
    setIsApproving(true);
    approveTimer.current = setTimeout(() => {
      setIsApproving(false);
      // 前置条件在等待期间失效（钱包断开/切网/余额清零）：放弃本次授权，
      // 不设置 isApproved，让派生状态回落到当前真实前置条件对应的态。
      if (prereqsStillValid()) {
        setIsApproved(true);
      }
    }, APPROVE_DELAY_MS);
  }, [state]);

  const buy = useCallback(() => {
    if (state !== "ready-to-buy") return;
    setIsBuying(true);
    buyTimer.current = setTimeout(() => {
      setIsBuying(false);
      // 同上：前置条件失效则放弃本次购买，绝不能让一笔来自已失效钱包状态的
      // 交易被写入购买记录。
      if (prereqsStillValid()) {
        recordPurchase(courseId, courseName, priceYD);
      }
    }, BUY_DELAY_MS);
  }, [state, courseId, courseName, priceYD]);

  return { state, approve, buy };
}
