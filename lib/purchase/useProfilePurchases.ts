"use client";

import { useSyncExternalStore } from "react";
import { mockTransactions } from "@/lib/mock/fixtures";
import { getPurchases, subscribePurchases, type MockPurchaseRecord } from "@/lib/mock/purchaseStore";
import { useWallet } from "@/lib/wallet/useWallet";

/**
 * 已购课程/购买记录 Tab 共用：优先读共享 Mock Store（feature 4 写入的真实购买记录，
 * feature 10 起按登录账户隔离），为空则回退本 feature 的默认 fixtures
 * （`mockTransactions`），两者字段结构一致。用 useSyncExternalStore 而非 useEffect
 * 里 setState 恢复，避免 hydration mismatch（见 specs/LESSONS.md 2026-08-12 Feature 4
 * 条目、2026-08-13 Feature 5 条目）。本 Hook 只会在 `/profile` 登录门禁判定
 * connected 为 true 之后被渲染，届时 address 必然非空。
 */
export function useProfilePurchases(): MockPurchaseRecord[] {
  const { address } = useWallet();
  return useSyncExternalStore(
    subscribePurchases,
    () => {
      const real = getPurchases(address);
      return real.length > 0 ? real : mockTransactions;
    },
    () => mockTransactions
  );
}
