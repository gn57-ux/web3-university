"use client";

import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useWallet } from "@/lib/wallet/useWallet";
import { useContractClients } from "@/lib/contracts/useContractClients";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { TARGET_CHAIN } from "@/lib/contracts/chain";
import { Web3UniversityAbi } from "@/lib/contracts/abis/Web3University";
import { COURSE_ID_MAP } from "@/lib/contracts/courseIdMap";
import { mockCourses } from "@/lib/mock/fixtures";
import { toContractErrorMessage } from "@/lib/contracts/txError";

/**
 * 取代原 `lib/mock/purchaseStore.ts` 的 `MockPurchaseRecord`：字段结构不变（保持
 * 下游展示组件不需要改动），字段来源换成链上读取。`txHash` 固定为 `undefined`——
 * `Purchase` 合约结构（`purchaseOf`）只存 `student/courseId/pricePaid/purchasedAt`，
 * 没有存交易哈希，历史交易哈希查询不在本 feature 范围（design.md「购买记录」）。
 */
export interface MockPurchaseRecord {
  courseId: string;
  courseName: string;
  priceYD: number;
  purchasedAt: string;
  txHash: undefined;
}

function courseNameForSlug(slug: string): string {
  return mockCourses.find((course) => course.id === slug)?.title ?? slug;
}

const KNOWN_COURSES = Object.entries(COURSE_ID_MAP).map(([slug, onchainCourseId]) => ({
  slug,
  onchainCourseId,
}));

export interface OnchainPurchasesResult {
  purchases: MockPurchaseRecord[];
  /** 首次读取（或账户切换后的重新读取）尚未完成。 */
  loading: boolean;
  error: string | null;
}

/**
 * 个人中心"已购课程"/"购买记录" Tab 共用：对已知的 3 门种子课程（`courseIdMap.ts`）
 * 逐一查询 `hasPurchased`/`purchaseOf`，过滤出已购买的。MVP 阶段课程数量固定
 * 已知，不引入事件索引器（design.md「技术决策」）。未登录（address 为 null）时
 * 视为没有任何购买记录，不发起链上读取。
 */
export function useOnchainPurchases(): OnchainPurchasesResult {
  const { address } = useWallet();
  const { publicClient } = useContractClients();
  // purchases/loading/error 合并成一个带查询键（key）的对象，而不是三个独立
  // useState——原因与 usePurchaseFlow.ts/LearningCenter.tsx 的同类修订记录一样：
  // `loading` 初始值是 false，只在 effect 的 queueMicrotask 里才变 true，首次
  // 打开个人中心（或账户切换后）的第一帧会先渲染出 `loading: false` 且
  // `purchases` 为空（或还是上一个账户的旧数据）——消费方（各 Tab 组件）只按
  // "数组为空"判断展示"暂无..."，会在真正开始读取前先误判为"确实没有"
  // （Codex Review 结构化复核第六轮抓到的 P2）。用 key 在渲染期同步比对，不
  // 一致就视为"尚未为当前账户开始读取"，统一走 loading。
  const [data, setData] = useState<{
    key: string;
    loading: boolean;
    purchases: MockPurchaseRecord[];
    error: string | null;
  }>({ key: "", loading: true, purchases: [], error: null });

  const queryKey = address ?? "anon";
  const effective = data.key === queryKey ? data : { loading: true, purchases: [], error: null };
  const { purchases, loading, error } = effective;

  // 纯读取函数，不直接 setState：真正提交结果的地方（下方 useEffect）自己决定
  // 什么时候提交，以便正确处理"账户在读取完成前又切换了一次"的竞态——见风险点
  // 「useOnchainPurchases 的 useEffect 依赖必须包含 address，否则会展示前一个
  // 账户的缓存数据」（specs/15.onchain-token-course-purchase/tasks.md）。
  const fetchPurchases = useCallback(
    async (studentAddress: string): Promise<MockPurchaseRecord[]> => {
      const addresses = CONTRACT_ADDRESSES[TARGET_CHAIN.id];
      const results = await Promise.all(
        KNOWN_COURSES.map(async ({ slug, onchainCourseId }) => {
          const purchased = await publicClient.readContract({
            address: addresses.Web3University,
            abi: Web3UniversityAbi,
            functionName: "hasPurchased",
            args: [onchainCourseId, studentAddress as `0x${string}`],
          });
          if (!purchased) return null;

          const [, , pricePaid, purchasedAt] = await publicClient.readContract({
            address: addresses.Web3University,
            abi: Web3UniversityAbi,
            functionName: "purchaseOf",
            args: [onchainCourseId, studentAddress as `0x${string}`],
          });

          const record: MockPurchaseRecord = {
            courseId: slug,
            courseName: courseNameForSlug(slug),
            priceYD: Number(formatUnits(pricePaid, 18)),
            purchasedAt: new Date(Number(purchasedAt) * 1000).toISOString(),
            txHash: undefined,
          };
          return record;
        })
      );
      return results.filter((record): record is MockPurchaseRecord => record !== null);
    },
    [publicClient]
  );

  useEffect(() => {
    // cancelled 标志防止竞态：账户从 A 切到 B 时，A 的 effect 清理函数会先把
    // cancelled 置为 true，即使 A 的读取比 B 晚返回，也不会用 A 的结果覆盖 B
    // 当前应该展示的数据（同类模式见 useContractClients.ts）。
    let cancelled = false;

    const key = address ?? "anon";

    if (!address) {
      queueMicrotask(() => {
        if (!cancelled) setData({ key, loading: false, purchases: [], error: null });
      });
      return () => {
        cancelled = true;
      };
    }

    // 账户切换（A -> B）时必须先清空 A 的购买记录，再发起 B 的读取——否则 B 的
    // 读取完成前，`purchases` 仍是 A 的旧数据；各 Tab 组件只在数组为空时展示
    // loading 骨架，`purchases` 非空会被误判为"已经是当前账户的真实结果"，
    // 用户会先看到 A 的课程/购买时间，读取失败时这份错误数据还会永久保留
    // （Codex Review 结构化复核抓到的 P1）。这里的 setData 带上新查询键 key，
    // 配合上方 effective 的渲染期同步比对（key 不匹配就视为 loading），微任务
    // 提交前的那一帧也不会露出旧账户的数据（Codex Review 结构化复核第六轮
    // 抓到的 P2）。
    queueMicrotask(() => {
      if (!cancelled) setData({ key, loading: true, purchases: [], error: null });
    });

    fetchPurchases(address)
      .then((records) => {
        if (!cancelled) setData({ key, loading: false, purchases: records, error: null });
      })
      .catch((e) => {
        if (!cancelled) {
          setData({ key, loading: false, purchases: [], error: toContractErrorMessage(e) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, fetchPurchases]);

  return { purchases, loading, error };
}
