"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPublicClient, formatUnits, http } from "viem";
import { TARGET_CHAIN } from "@/lib/contracts/chain";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { YDTokenAbi } from "@/lib/contracts/abis/YDToken";
import { toContractErrorMessage } from "@/lib/contracts/txError";

export interface OnchainBalanceState {
  /** `YDToken.balanceOf(address)` 的真实链上余额，已从最小单位（18 位小数）转换为
   *  展示用的 YD 整数。注意：`balanceLoading` 为 `true` 或 `balanceError` 非空时，
   *  这个值不代表"确认的真实余额"（未登录/读取中/读取失败时都暂存为 0）——调用方
   *  必须先检查 `balanceLoading`/`balanceError`，不能把 `ydBalance === 0` 直接当成
   *  "余额确实为零"（Codex Review 结构化复核最后一轮抓到的 P2：`usePurchaseFlow`
   *  之前就是这样把"还没读到"误判成"余额不足"，进而错误展示 Faucet 领取入口）。 */
  ydBalance: number;
  /** 当前是否正在读取余额（挂载首次读取、账户切换后的重新读取、或
   *  `refetchYdBalance()` 尚未 resolve）。为 `true` 时 `ydBalance` 只是过渡态占位
   *  值，不代表真实余额。 */
  balanceLoading: boolean;
  /** 写操作（Faucet 领取/购买）确认后手动调用，触发重新读取。见
   *  specs/15.onchain-token-course-purchase/design.md 模块 1「架构决策」——
   *  MVP 阶段不用订阅/轮询，只在自己发起的写操作确认后才刷新。 */
  refetchYdBalance: () => Promise<void>;
  /** 最近一次读取（挂载/账户切换/`refetchYdBalance()`）失败的原因（RPC 错误
   *  等）；成功后自动清空。之前静默吞掉这个失败，会让 Faucet 领取成功后余额
   *  永久停留在旧值，用户只能靠整页刷新恢复（Codex Review 结构化复核第四轮
   *  抓到的 P2），因此改为显式暴露给调用方展示，而不是继续假装刷新总会成功。
   *  为非空时同上，`ydBalance` 不代表真实余额。 */
  balanceError: string | null;
}

// 本 Hook 特意不复用 `useContractClients()`：那个 Hook 内部会调用 `useWallet()`
// 来判断 `connected`（决定要不要构建 walletClient），而 `useWallet.tsx` 反过来要
// 组合本 Hook 的结果暴露 `ydBalance`——如果这里也调用 `useContractClients()`，
// 就会形成 useWallet → useOnchainBalance → useContractClients → useWallet 的
// Hook 调用环（不是无限递归，但会在同一次渲染里重复执行一遍 Privy 的
// usePrivy/useWallets/useLogin/useLogout，属于不必要且容易踩坑的耦合）。余额读取
// 只需要一个只读的 publicClient，与登录状态无关，因此在这里独立创建，
// 与 `useContractClients.ts` 内部创建 publicClient 的方式保持一致但物理上分离。
export function useOnchainBalance(address: string | null): OnchainBalanceState {
  const publicClient = useMemo(
    () => createPublicClient({ chain: TARGET_CHAIN, transport: http() }),
    []
  );
  const [ydBalance, setYdBalance] = useState(0);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  // 初始值为 true：还不知道 address 是否已经就绪（Privy/embeddedWallet 的首次
  // 解析也是异步的），在第一次 effect 判断出"未登录"之前，不能让 ydBalance=0
  // 这个占位值被下游误当成"已确认的零余额"。
  const [balanceLoading, setBalanceLoading] = useState(true);

  // refetchYdBalance() 是异步的：账户 A 发起刷新、等待确认期间切换到账户 B，
  // A 的读取结果不能在完成时无条件写入——ydBalance 现在是跨组件共享的 Context
  // 状态（见 useWallet.tsx「修订记录」），A 的过期结果会覆盖 B 当前应该看到的
  // 真实余额，且不会再被任何后续操作自动纠正，直到用户手动触发下一次刷新
  // （Codex Review 结构化复核抓到的 P1）。用一个每次渲染都同步写入的 ref
  // 记录"当前真正最新"的地址，在 await 之后比对，不一致就丢弃这次结果——
  // 与 usePurchaseFlow.ts 的 `latestAddressRef` 同一模式。
  const latestAddressRef = useRef(address);
  useEffect(() => {
    latestAddressRef.current = address;
  }, [address]);

  const readBalance = useCallback(
    async (accountAddress: string): Promise<number> => {
      const balance = await publicClient.readContract({
        address: CONTRACT_ADDRESSES[TARGET_CHAIN.id].YDToken,
        abi: YDTokenAbi,
        functionName: "balanceOf",
        args: [accountAddress as `0x${string}`],
      });
      return Number(formatUnits(balance, 18));
    },
    [publicClient]
  );

  useEffect(() => {
    let cancelled = false;

    if (!address) {
      // react-hooks/set-state-in-effect：不能在 effect 主体同步调用 setState，
      // 用 queueMicrotask 延后到下一个微任务（与 useContractClients.ts 的
      // 同类分支保持一致的写法）。未登录时"余额为 0"是确定的真实结论（没有
      // 账户就没有余额），balanceLoading 归 false，不是"还没读到"。
      queueMicrotask(() => {
        if (!cancelled) {
          setYdBalance(0);
          setBalanceError(null);
          setBalanceLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    // 账户切换时必须先清空上一个账户的余额，再发起新账户的读取——否则新账户的
    // 读取完成前，UI 会继续显示上一个账户的 ydBalance；如果新账户的读取还失败
    // 了，下面 catch 分支"保留旧值"的策略会让上一个账户的余额永久滞留在当前
    // 账户名下，购买流程的 insufficient-balance 判断也会用错账户的余额（Codex
    // Review 结构化复核第三轮抓到的 P1）。这里清零后立即发起新读取，属于同一次
    // 账户切换的必经过渡态，不是给"读取失败"用的兜底值。
    queueMicrotask(() => {
      if (!cancelled) {
        setYdBalance(0);
        setBalanceError(null);
        setBalanceLoading(true);
      }
    });

    readBalance(address)
      .then((balance) => {
        if (!cancelled) {
          setYdBalance(balance);
          setBalanceError(null);
          setBalanceLoading(false);
        }
      })
      .catch((e) => {
        // 读取失败（RPC 错误等）：余额保留（刚清零后的）当前值，但错误必须
        // 显式暴露为 balanceError，不能静默吞掉——否则 Faucet 领取成功后这里
        // 的刷新一旦失败，用户会永久卡在旧余额，只能靠整页刷新恢复（Codex
        // Review 结构化复核第四轮抓到的 P2）。balanceLoading 同时归 false——
        // "读取失败"和"还在读取"是两个独立状态，不能让失败态继续显示成
        // loading（调用方靠 balanceError 非空识别失败态，不看 balanceLoading）。
        if (!cancelled) {
          setBalanceError(toContractErrorMessage(e));
          setBalanceLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, readBalance]);

  const refetchYdBalance = useCallback(async () => {
    if (!address) {
      setYdBalance(0);
      return;
    }
    const requestedAddress = address;
    try {
      const balance = await readBalance(requestedAddress);
      // 只有发起请求的账户仍是当前账户时才提交结果，避免过期请求覆盖
      // 已经切换到的新账户的余额（见上方 latestAddressRef 说明）。
      if (latestAddressRef.current === requestedAddress) {
        setYdBalance(balance);
        setBalanceError(null);
      }
    } catch (e) {
      // 刷新失败保留旧余额，但错误必须显式暴露（见上方 balanceError 说明），
      // 不能只靠调用方（Faucet 领取/购买流程）自己的写操作错误掩盖这次读取
      // 失败——那是两个独立的失败原因。
      if (latestAddressRef.current === requestedAddress) {
        setBalanceError(toContractErrorMessage(e));
      }
    }
  }, [address, readBalance]);

  return { ydBalance, balanceLoading, refetchYdBalance, balanceError };
}
