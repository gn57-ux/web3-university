"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useContractClients } from "@/lib/contracts/useContractClients";
import { useWallet } from "@/lib/wallet/useWallet";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { TARGET_CHAIN } from "@/lib/contracts/chain";
import { YDFaucetAbi } from "@/lib/contracts/abis/YDFaucet";
import { toContractErrorMessage, type TxStatus } from "@/lib/contracts/txError";

export interface FaucetClaimState {
  status: TxStatus;
  txHash: `0x${string}` | null;
  error: string | null;
  /** 未登录/嵌入式钱包未就绪时为 true，消费方应禁用领取按钮。 */
  disabled: boolean;
  /** 返回本次领取是否成功——调用方（如 PurchasePanel）需要据此决定要不要触发
   *  `wallet.refetchYdBalance()`，不能在 `await claim()` 之后直接读 `status`：
   *  `claim()` 内部的 `setStatus` 触发的是下一次渲染才会反映的新值，`await`
   *  完成的那一刻，闭包里捕获的 `status` 变量仍是调用前那次渲染的旧值（经典的
   *  stale closure），必须靠返回值传递结果。 */
  claim: () => Promise<boolean>;
}

/**
 * 调用 `YDFaucet.claim()`。遵循 [[14.contract-client-foundation]] 定下的写操作
 * 标准顺序：`publicClient.simulateContract()` 先行（拿到能被 `toContractErrorMessage`
 * 解码的自定义 revert 原因，例如 `AlreadyClaimed`）→ 用其 `request` 调用
 * `walletClient.writeContract()` → `waitForTransactionReceipt()` 确认。
 */
export function useFaucetClaim(): FaucetClaimState {
  const { walletClient, publicClient } = useContractClients();
  const wallet = useWallet();
  const [status, setStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 与 usePurchaseFlow.ts 的 approve()/buy() 同一套账户切换竞态防护
  // （Codex Review 结构化复核第四轮抓到的 P2）：账户 A 发起领取后若在签名或
  // 确认期间切换到账户 B，本 Hook 之前既不重置状态也不校验回调对应的账户，
  // A 的交易哈希/pending/成功/错误会继续写入已经属于 B 的会话。
  const latestAddressRef = useRef(wallet.address);
  useEffect(() => {
    latestAddressRef.current = wallet.address;
  }, [wallet.address]);

  // 账户切换时清空上一个账户遗留的领取会话状态，不能让它跨账户可见。
  // react-hooks/set-state-in-effect：不能在 effect 主体同步调用 setState，
  // 用 queueMicrotask 延后（与项目内同类分支保持一致的写法）。
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setStatus("idle");
        setTxHash(null);
        setError(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [wallet.address]);

  const claim = useCallback(async (): Promise<boolean> => {
    // walletClient 可能为 null（未登录，或账户切换中的短暂窗口——见
    // useContractClients.ts 的 isWalletClientCurrent 校验），必须判空后才能发起
    // 写操作，不能假设"点得到按钮就说明 walletClient 已就绪"。
    if (!walletClient || !walletClient.account) return false;
    const account = walletClient.account;
    const startAddress = account.address;
    const isStale = () => latestAddressRef.current !== startAddress;

    setStatus("signing");
    setError(null);
    try {
      const { request } = await publicClient.simulateContract({
        account,
        address: CONTRACT_ADDRESSES[TARGET_CHAIN.id].YDFaucet,
        abi: YDFaucetAbi,
        functionName: "claim",
      });
      const hash = await walletClient.writeContract(request);
      if (isStale()) return false;
      setTxHash(hash);
      setStatus("pending");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("交易未成功确认");
      }
      if (isStale()) return false;
      setStatus("success");
      return true;
    } catch (e) {
      if (isStale()) return false;
      setStatus("error");
      setError(toContractErrorMessage(e));
      return false;
    }
  }, [walletClient, publicClient]);

  return { status, txHash, error, disabled: !walletClient, claim };
}
