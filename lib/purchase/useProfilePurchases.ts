"use client";

import { useSyncExternalStore } from "react";
import { mockTransactions } from "@/lib/mock/fixtures";
import { getPurchases, subscribePurchases, type MockPurchaseRecord } from "@/lib/mock/purchaseStore";

/**
 * 已购课程/购买记录 Tab 共用：优先读共享 Mock Store（feature 4 写入的真实购买记录），
 * 为空则回退本 feature 的默认 fixtures（`mockTransactions`），两者字段结构一致。
 * 用 useSyncExternalStore 而非 useEffect 里 setState 恢复，避免 hydration mismatch
 * （见 specs/LESSONS.md 2026-08-12 Feature 4 条目、2026-08-13 Feature 5 条目）。
 */
export function useProfilePurchases(): MockPurchaseRecord[] {
  return useSyncExternalStore(
    subscribePurchases,
    () => {
      const real = getPurchases();
      return real.length > 0 ? real : mockTransactions;
    },
    () => mockTransactions
  );
}
