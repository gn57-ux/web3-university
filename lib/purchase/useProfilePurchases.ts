"use client";

import { useOnchainPurchases, type MockPurchaseRecord } from "./useOnchainPurchases";

export type { MockPurchaseRecord };

export interface ProfilePurchases {
  purchases: MockPurchaseRecord[];
  loading: boolean;
  error: string | null;
}

/**
 * 已购课程/购买记录/学习进度 Tab 共用：直接透传 `useOnchainPurchases()` 的链上
 * 读取结果。不再像 Mock 版本那样在没有真实记录时回退展示固定的
 * `mockTransactions`——链上数据就是唯一真实来源，没有购买记录时应该展示"暂无"，
 * 而不是让新用户看到自己从未购买过的课程被标成"已购买"（这是本 feature 相对
 * Mock 版本的一处行为变化，见 specs/15.onchain-token-course-purchase 的实现
 * 报告，不是遗漏）。本 Hook 只会在 `/profile` 登录门禁判定 connected 为 true 之
 * 后被渲染，届时 address 必然非空。
 */
export function useProfilePurchases(): ProfilePurchases {
  const { purchases, loading, error } = useOnchainPurchases();
  return { purchases, loading, error };
}
