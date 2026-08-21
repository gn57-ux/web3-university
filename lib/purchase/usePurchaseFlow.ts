"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useWallet } from "@/lib/wallet/useWallet";
import { useContractClients } from "@/lib/contracts/useContractClients";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { TARGET_CHAIN } from "@/lib/contracts/chain";
import { YDTokenAbi } from "@/lib/contracts/abis/YDToken";
import { Web3UniversityAbi } from "@/lib/contracts/abis/Web3University";
import { toContractErrorMessage, type TxStatus } from "@/lib/contracts/txError";
import { getOnchainCourseId } from "@/lib/contracts/courseIdMap";

export type PurchaseState =
  | "wallet-disconnected"
  | "wrong-network"
  // allowance/hasPurchased 尚未完成首次链上读取（登录/切换课程后的短暂窗口）。
  // 不在 tasks.md 列出的原始档位表里，是移植到真实链上读取后新增的一档：Mock 版本
  // 的 isPurchased/isApproved 都是同步的本地 useState，没有"读取中"这个概念；
  // 真实链上读取是异步的，如果不加这一档，会在数据还没到达前用 allowance/
  // hasPurchased 的初始值（null）落到某个看似正常的档位（例如误判为
  // needs-approval），见 design.md「安全考虑」对"读取失败不能默认落到正常档位"
  // 的要求——读取中和读取失败是同一类问题的两个阶段，都需要显式状态。
  | "loading"
  // allowance/hasPurchased 读取失败（RPC 错误等），design.md「安全考虑」明确要求
  // 的显式展示态，不允许掩盖为其他看起来正常的档位。
  | "read-error"
  | "insufficient-balance"
  | "needs-approval"
  | "approving"
  | "ready-to-buy"
  | "buying"
  | "purchased";

export interface PurchaseFlowResult {
  state: PurchaseState;
  approve: () => Promise<void>;
  buy: () => Promise<void>;
  approveError: string | null;
  buyError: string | null;
  readError: string | null;
  /** 最近一次授权交易的哈希，仅用于当次会话展示，不做持久化查询。 */
  lastApproveTxHash: `0x${string}` | null;
  /** 最近一次购买交易的哈希，仅用于当次会话展示，不做持久化查询（见
   *  design.md「购买记录」：`Purchase` 合约结构未存哈希，历史交易哈希查询不在
   *  本 feature 范围）。 */
  lastBuyTxHash: `0x${string}` | null;
  /** `Web3University.purchaseOf(courseId, student)` 的真实链上购买记录（`state`
   *  为 `"purchased"` 时才非空）：实际支付价格与购买时间，而不是课程 fixture
   *  里的 `priceYD`（requirements.md 要求课程详情页展示的是链上真实购买信息，
   *  不是当前展示价——两者理论上应该相等，但价格来源必须以链上为准）。 */
  purchaseRecord: { pricePaidYD: number; purchasedAt: string } | null;
}

export function usePurchaseFlow(
  courseId: string,
  courseName: string,
  priceYD: number
): PurchaseFlowResult {
  const wallet = useWallet();
  const { walletClient, publicClient } = useContractClients();
  const addresses = CONTRACT_ADDRESSES[TARGET_CHAIN.id];

  const onchainCourseId = useMemo(() => getOnchainCourseId(courseId), [courseId]);
  const priceWei = useMemo(() => parseUnits(String(priceYD), 18), [priceYD]);

  // approve()/buy() 里的"账户在等待确认期间是否切换了"检查，不能直接比较
  // `wallet.address`：`approve`/`buy` 本身是 useCallback，一旦某次点击触发的
  // 闭包被创建，闭包内引用的 `wallet.address` 就固定成了创建那一刻的快照值，
  // 和同一次调用里捕获的 `startAddress` 永远相等——检查形同虚设，测不出账户
  // 切换。用一个每次渲染都同步写入的 ref 存"当前真正最新"的地址，在 await
  // 之后读 ref.current 才能拿到调用发起之后账户是否变化过的真实结果。
  const latestAddressRef = useRef(wallet.address);
  useEffect(() => {
    latestAddressRef.current = wallet.address;
  }, [wallet.address]);

  // allowance/hasPurchased/purchaseRecord/readError 合并成一个带查询键的对象
  // （而不是各自独立的 useState），原因见下方 queryKey/effectiveRead：账户或
  // 课程切换时，effect 里用 queueMicrotask 清空这些值（react-hooks/
  // set-state-in-effect 规则要求），但 React 在这次微任务执行前会先用旧查询键
  // 的结果同步渲染一帧——例如刚从"已购课程 A"切到"未购课程 B"，这一帧仍会把
  // A 的 hasPurchased/purchaseRecord 当成 B 的结果展示（Codex Review 结构化
  // 复核第五轮抓到的 P2）。只清空四个独立 useState 做不到"渲染期同步识别出
  // 结果已经过期"，必须像 LearningCenter.tsx 那样把结果和产生它的查询键绑在
  // 一起，渲染时同步比对。
  const [readState, setReadState] = useState<{
    key: string;
    allowance: bigint | null;
    hasPurchased: boolean | null;
    purchaseRecord: PurchaseFlowResult["purchaseRecord"];
    readError: string | null;
  }>({ key: "", allowance: null, hasPurchased: null, purchaseRecord: null, readError: null });

  const queryKey = `${wallet.address ?? "anon"}::${courseId}`;
  // 查询键不匹配（wallet.address/courseId 已经变化，但上面 effect 的
  // queueMicrotask 还没来得及提交新结果）时，一律视为"尚未读取"，不使用旧
  // 查询键的残留结果——与 LearningCenter.tsx 的 effectiveStatus 同一模式。
  const effectiveRead = readState.key === queryKey ? readState : null;
  const allowance = effectiveRead?.allowance ?? null;
  const hasPurchased = effectiveRead?.hasPurchased ?? null;
  const purchaseRecord = effectiveRead?.purchaseRecord ?? null;
  const readError = effectiveRead?.readError ?? null;

  const [approveStatus, setApproveStatus] = useState<TxStatus>("idle");
  const [approveError, setApproveError] = useState<string | null>(null);
  const [lastApproveTxHash, setLastApproveTxHash] = useState<`0x${string}` | null>(null);

  const [buyStatus, setBuyStatus] = useState<TxStatus>("idle");
  const [buyError, setBuyError] = useState<string | null>(null);
  const [lastBuyTxHash, setLastBuyTxHash] = useState<`0x${string}` | null>(null);

  // 纯读取函数，不直接 setState——真正提交结果的地方（下方 useEffect / 手动
  // refetchOnchainState）各自决定什么时候提交，用途不同：前者要处理"账户切换"
  // 竞态（cancelled 标志），后者（approve/buy 确认后调用）已经由调用方自己校验
  // 过 wallet.address === startAddress 才会调用，不需要重复的竞态保护。
  const readOnchainState = useCallback(
    async (studentAddress: string) => {
      const [allowanceResult, purchasedResult, purchaseOfResult] = await Promise.all([
        publicClient.readContract({
          address: addresses.YDToken,
          abi: YDTokenAbi,
          functionName: "allowance",
          args: [studentAddress as `0x${string}`, addresses.Web3University],
        }),
        publicClient.readContract({
          address: addresses.Web3University,
          abi: Web3UniversityAbi,
          functionName: "hasPurchased",
          args: [onchainCourseId, studentAddress as `0x${string}`],
        }),
        // 未购买时这个调用返回全零值（合约 mapping 的默认值，不会 revert），
        // 无条件一起读取比"先查 hasPurchased 再决定要不要查 purchaseOf"少一次
        // 串行往返；requirements.md 要求课程详情展示链上真实购买信息（实际
        // 支付价格、购买时间），不能只满足于 hasPurchased 这个布尔值
        // （Codex Review 结构化复核抓到的 P1）。
        publicClient.readContract({
          address: addresses.Web3University,
          abi: Web3UniversityAbi,
          functionName: "purchaseOf",
          args: [onchainCourseId, studentAddress as `0x${string}`],
        }),
      ]);
      const [, , pricePaid, purchasedAt] = purchaseOfResult;
      const purchaseRecordResult = purchasedResult
        ? {
            pricePaidYD: Number(formatUnits(pricePaid, 18)),
            purchasedAt: new Date(Number(purchasedAt) * 1000).toISOString(),
          }
        : null;
      return {
        allowance: allowanceResult,
        hasPurchased: purchasedResult,
        purchaseRecord: purchaseRecordResult,
      };
    },
    [publicClient, addresses.YDToken, addresses.Web3University, onchainCourseId]
  );

  // 方案 B（design.md「架构决策」）：不订阅/轮询，只在"当前登录学生自己"的读取
  // 时机（挂载、账户变化、写操作确认后）主动 refetch 一次。供 approve()/buy()
  // 确认后调用，调用方已自行校验账户未变化。
  const refetchOnchainState = useCallback(async () => {
    if (!wallet.address) {
      setReadState({ key: `anon::${courseId}`, allowance: null, hasPurchased: null, purchaseRecord: null, readError: null });
      return;
    }
    // 调用方（approve()/buy()）在调用本函数前已经检查过账户没有切换，但那只
    // 保证了"调用发起时"账户一致——本函数内部的 readOnchainState 还要再 await
    // 一次 RPC 往返，这段等待期间账户仍可能切换。捕获发起读取时的账户，在
    // await 完成后重新比对 latestAddressRef，不一致就丢弃这次结果，不能无条件
    // 提交（Codex Review 结构化复核第三轮抓到的 P1：会把账户 A 的读取结果覆盖
    // 到账户 B 当前应该看到的 allowance/hasPurchased/purchaseRecord 上）。
    const requestedAddress = wallet.address;
    const requestedKey = `${requestedAddress}::${courseId}`;
    try {
      const result = await readOnchainState(requestedAddress);
      if (latestAddressRef.current !== requestedAddress) return;
      setReadState({ key: requestedKey, ...result, readError: null });
    } catch (e) {
      if (latestAddressRef.current !== requestedAddress) return;
      setReadState({
        key: requestedKey,
        allowance: null,
        hasPurchased: null,
        purchaseRecord: null,
        readError: toContractErrorMessage(e),
      });
    }
  }, [wallet.address, courseId, readOnchainState]);

  useEffect(() => {
    // cancelled 标志防止竞态：账户切换时旧 effect 的清理函数先把 cancelled
    // 置为 true，即使旧账户的读取比新账户晚返回，也不会覆盖新账户当前应该
    // 展示的 allowance/hasPurchased（同类模式见 useContractClients.ts）。
    let cancelled = false;

    // 账户或课程切换时，除了 allowance/hasPurchased/readError，还必须清空
    // 上一个账户遗留的交易会话状态（approveStatus/buyStatus/两类交易错误/
    // 两个交易哈希）——否则账户 A 完成过一次授权/购买后切换到账户 B，B 会在
    // UI 上看到 A 的交易哈希；若切换发生在 A 的交易待确认期间，B 的面板还会
    // 被卡在 approving/buying（Codex Review 结构化复核抓到的 P2）。这些是
    // "当前登录账户这一次会话"的瞬时 UI 状态，不属于需要跨账户保留的信息，
    // 账户/课程一变就应该归零；与下方 allowance/hasPurchased 的清空合并进
    // 同一个 queueMicrotask，不额外增加一次渲染。
    function resetTransientState() {
      setApproveStatus("idle");
      setApproveError(null);
      setLastApproveTxHash(null);
      setBuyStatus("idle");
      setBuyError(null);
      setLastBuyTxHash(null);
    }

    const key = `${wallet.address ?? "anon"}::${courseId}`;

    if (!wallet.address) {
      queueMicrotask(() => {
        if (!cancelled) {
          setReadState({ key, allowance: null, hasPurchased: null, purchaseRecord: null, readError: null });
          resetTransientState();
        }
      });
      return () => {
        cancelled = true;
      };
    }

    // 账户或课程切换时，必须先清空上一次查询键（旧账户/旧课程）对应的
    // allowance/hasPurchased，再发起新的读取——否则新查询键的结果到达前，
    // state 派生会继续沿用旧查询键的值（例如上一门课已购买，切到新课程/新
    // 账户后仍短暂显示 purchased），读取一旦失败，旧值会被 catch 分支的
    // readError 掩盖成永久性的错误展示，状态却仍停留在旧的 purchased/
    // ready-to-buy 等档位（Codex Review 结构化复核抓到的 P2）。清空后落到
    // 显式的 "loading" 档位，与"读取尚未完成"这个真实情况一致。清空/新结果都
    // 带上这次的 key，配合上方 effectiveRead 的渲染期同步比对——queueMicrotask
    // 提交前的那一帧会因为 key 不匹配自动落到"尚未读取"，不会露出旧查询键的
    // 结果（Codex Review 结构化复核第五轮抓到的 P2）。
    queueMicrotask(() => {
      if (!cancelled) {
        setReadState({ key, allowance: null, hasPurchased: null, purchaseRecord: null, readError: null });
        resetTransientState();
      }
    });

    readOnchainState(wallet.address)
      .then((result) => {
        if (!cancelled) {
          setReadState({ key, ...result, readError: null });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setReadState({
            key,
            allowance: null,
            hasPurchased: null,
            purchaseRecord: null,
            readError: toContractErrorMessage(e),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [wallet.address, courseId, readOnchainState]);

  const state: PurchaseState = useMemo(() => {
    if (hasPurchased) return "purchased";
    if (!wallet.connected) return "wallet-disconnected";
    if (wallet.network !== "correct") return "wrong-network";
    if (buyStatus === "signing" || buyStatus === "pending") return "buying";
    if (approveStatus === "signing" || approveStatus === "pending") return "approving";
    // wallet.balanceError 非空时，wallet.ydBalance 不代表真实余额（见
    // useOnchainBalance.ts 的字段说明）——之前只检查本 Hook 自己的 readError
    // （allowance/hasPurchased 读取失败），没有把余额读取失败也算进去，会把
    // "余额未知"误判成后面 insufficient-balance 分支里的"余额为 0"，错误展示
    // Faucet 领取入口（Codex Review 结构化复核最后一轮抓到的 P2）。
    if (readError || wallet.balanceError) return "read-error";
    if (allowance === null || hasPurchased === null) return "loading";
    // wallet.balanceLoading 为 true 时同理，wallet.ydBalance 只是过渡态占位值
    // （挂载首次读取、账户切换后的重新读取都会先归零），不能直接拿去和 priceYD
    // 比较——会把"还没读到余额"误判成"余额不足 0"，同样错误展示 Faucet。
    if (wallet.balanceLoading) return "loading";
    // 只读链上状态可能先于 walletClient 就绪（getEthereumProvider() 是异步的，
    // 见 useContractClients.ts）——如果不在这里判断，state 会落到
    // needs-approval/ready-to-buy，TwoPhaseTxButton 的按钮会显示成可点击，
    // 但 approve()/buy() 内部的 `!walletClient` 判空会让点击静默什么都不做，
    // 用户既没有错误提示也没有恢复入口（Codex Review 结构化复核第五轮抓到的
    // P2）。walletClient 未就绪本质上和"链上数据还没读完"是同一类"还不能交易"
    // 的过渡态，复用已有的 loading 档位即可，不需要新增一个专门状态。
    if (!walletClient) return "loading";
    // 门禁必须按"这门课实际需要付多少"判断，不能用 requiredBalanceYD——那是
    // 课程 fixture 里一个独立的展示字段（例如 solidity-101 的 requiredBalanceYD
    // 是 20，但链上真实价格只有 4 YD），与购买这门课真正需要的余额无关。用
    // requiredBalanceYD 网关会导致：领取一次 Faucet（20 YD）后先买了别的课程，
    // 剩余余额明明够买这门课，却被判定为余额不足；再次领取又必然遇到
    // AlreadyClaimed，购买顺序不同就可能永久买不到某些课程（Codex Review 结构化
    // 复核第六轮抓到的 P1）。priceYD 是 approve()/buy() 实际用来构造交易的同一个
    // 价格来源（见 priceWei 的计算），门禁判断必须和交易执行用同一个价格。
    if (wallet.ydBalance < priceYD) return "insufficient-balance";
    if (allowance >= priceWei) return "ready-to-buy";
    return "needs-approval";
  }, [
    hasPurchased,
    wallet.connected,
    wallet.network,
    wallet.ydBalance,
    wallet.balanceLoading,
    wallet.balanceError,
    priceYD,
    buyStatus,
    approveStatus,
    readError,
    allowance,
    priceWei,
    walletClient,
  ]);

  const approve = useCallback(async () => {
    if (state !== "needs-approval" || !walletClient || !walletClient.account) return;
    // 捕获发起授权时的账户：simulateContract 用它显式指定签名账户（不依赖
    // "当前"钱包状态），等待确认期间账户可能切换——确认后只有当前账户仍与发起
    // 账户一致时才刷新链上状态，否则这次 refetch 会把"账户 A 的授权结果"错误地
    // 当成"当前显示的账户 B"的状态。账户切换本身已经有另一条路径保证正确性：
    // refetchOnchainState 的依赖包含 wallet.address，账户切换时会自动为新账户
    // 触发一次独立的读取，不需要这里补一次。
    const account = walletClient.account;
    const startAddress = account.address;
    // 发起授权后的每一步 await（写交易、等确认）期间账户都可能切换；账户切换的
    // effect 会重置 approveStatus/error/hash 这些"当前会话瞬时状态"，但如果这里
    // 不加判断继续无条件 setState，A 的旧异步调用完成时会把 A 的哈希/状态重新
    // 写回已经属于 B 的会话（Codex Review 结构化复核第三轮抓到的 P2）。每次要
    // 提交 UI 状态前都用 latestAddressRef 重新校验，不一致就静默丢弃——交易本身
    // 已经广播上链，只是不再对（已经切走的）当前账户的 UI 可见。
    const isStale = () => latestAddressRef.current !== startAddress;
    setApproveStatus("signing");
    setApproveError(null);
    try {
      const { request } = await publicClient.simulateContract({
        account,
        address: addresses.YDToken,
        abi: YDTokenAbi,
        functionName: "approve",
        args: [addresses.Web3University, priceWei],
      });
      const hash = await walletClient.writeContract(request);
      if (isStale()) return;
      setLastApproveTxHash(hash);
      setApproveStatus("pending");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("交易未成功确认");
      }
      if (isStale()) return;
      await refetchOnchainState();
      setApproveStatus("success");
    } catch (e) {
      if (isStale()) return;
      setApproveStatus("error");
      setApproveError(toContractErrorMessage(e));
    }
  }, [state, walletClient, publicClient, addresses, priceWei, refetchOnchainState]);

  const buy = useCallback(async () => {
    if (state !== "ready-to-buy" || !walletClient || !walletClient.account) return;
    const account = walletClient.account;
    const startAddress = account.address;
    // 与 approve() 相同的账户切换竞态防护（见上方 approve() 注释），购买流程
    // 步骤更多、等待更久，未提交状态被旧账户异步结果覆盖的窗口也更大。
    const isStale = () => latestAddressRef.current !== startAddress;
    setBuyStatus("signing");
    setBuyError(null);
    try {
      const { request } = await publicClient.simulateContract({
        account,
        address: addresses.Web3University,
        abi: Web3UniversityAbi,
        functionName: "buyCourse",
        args: [onchainCourseId],
      });
      const hash = await walletClient.writeContract(request);
      if (isStale()) return;
      setLastBuyTxHash(hash);
      setBuyStatus("pending");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("交易未成功确认");
      }
      if (isStale()) return;
      await refetchOnchainState();
      await wallet.refetchYdBalance();
      setBuyStatus("success");
    } catch (e) {
      if (isStale()) return;
      setBuyStatus("error");
      setBuyError(toContractErrorMessage(e));
    }
  }, [
    state,
    walletClient,
    publicClient,
    addresses,
    onchainCourseId,
    wallet,
    refetchOnchainState,
  ]);

  return {
    state,
    approve,
    buy,
    approveError,
    buyError,
    readError,
    lastApproveTxHash,
    lastBuyTxHash,
    purchaseRecord,
  };
}
