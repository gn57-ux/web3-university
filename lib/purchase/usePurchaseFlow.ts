"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useWallet } from "@/lib/wallet/useWallet";
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
  const wallet = useWallet();

  // 「是否已购买」读取自共享 Mock Store（localStorage），用 useSyncExternalStore
  // 而非「useState 初值 false + useEffect 里 setState」：
  // getServerSnapshot 恒返回 false，服务端渲染与客户端首次渲染结果一致，不产生
  // hydration mismatch；recordPurchase() 成功后 store 内部 notify 订阅者，
  // 该 Hook 会自动感知变化并重新渲染为 "purchased" 态，无需手动 setState。
  const isPurchased = useSyncExternalStore(
    subscribePurchases,
    () => getPurchases(wallet.address).some((record) => record.courseId === courseId),
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
    address: wallet.address,
    requiredBalanceYD,
  });
  useEffect(() => {
    prereqsRef.current = {
      connected: wallet.connected,
      network: wallet.network,
      ydBalance: wallet.ydBalance,
      address: wallet.address,
      requiredBalanceYD,
    };
  }, [wallet.connected, wallet.network, wallet.ydBalance, wallet.address, requiredBalanceYD]);

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
    // 捕获发起授权时的账户地址：完成时不能只看"当前账户是否仍然合法"，还要
    // 确认完成时的账户与发起时是同一个——否则账户 A 发起、等待期间切到账户 B，
    // B 会凭空获得一个自己从未点过的"已授权"态。
    const startAddress = wallet.address;
    setIsApproving(true);
    approveTimer.current = setTimeout(() => {
      setIsApproving(false);
      // 前置条件在等待期间失效（钱包断开/切网/余额清零）：放弃本次授权，
      // 不设置 isApproved，让派生状态回落到当前真实前置条件对应的态。
      if (prereqsStillValid() && prereqsRef.current.address === startAddress) {
        setIsApproved(true);
      }
    }, APPROVE_DELAY_MS);
  }, [state, wallet.address]);

  const buy = useCallback(() => {
    if (state !== "ready-to-buy") return;
    // 同上：捕获发起购买时的账户地址，完成时要求当前账户与发起账户一致，
    // 不能只用"完成时读到的当前地址"写入购买记录——否则账户 A 发起购买、
    // 1.2 秒等待期间退出并登录账户 B，这笔购买会被错误记到 B 名下、
    // 授予 B 本不该拥有的课程权限。
    const startAddress = wallet.address;
    setIsBuying(true);
    buyTimer.current = setTimeout(() => {
      setIsBuying(false);
      // 同上：前置条件失效或账户已切换则放弃本次购买，绝不能让一笔来自
      // 已失效/已变更账户的交易被写入购买记录。address 判空是防御性的：
      // prereqsStillValid() 要求 connected 为 true，但存在登录成功、嵌入式
      // 钱包尚未完成创建的极短窗口（connected=true 但 address 仍为 null）。
      const address = prereqsRef.current.address;
      if (prereqsStillValid() && address && address === startAddress) {
        recordPurchase(address, courseId, courseName, priceYD);
      }
    }, BUY_DELAY_MS);
  }, [state, courseId, courseName, priceYD, wallet.address]);

  return { state, approve, buy };
}
