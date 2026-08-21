"use client";

import { useProfilePurchases } from "@/lib/purchase/useProfilePurchases";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" });
}

export function PurchaseRecordsTab() {
  const { purchases, loading, error } = useProfilePurchases();

  if (loading && purchases.length === 0) {
    return <p className="text-body-md text-on-surface-variant">读取链上购买记录中...</p>;
  }

  // 读取失败必须单独展示，不能被"暂无购买记录"这个正常空态掩盖（同
  // PurchasedCoursesTab.tsx，Codex Review 结构化复核抓到的问题）。
  if (error) {
    return <p className="text-body-md text-error">读取购买记录失败：{error}</p>;
  }

  if (purchases.length === 0) {
    return <p className="text-body-md text-on-surface-variant">暂无购买记录。</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant">
      <table className="w-full min-w-[560px] text-left text-body-md">
        <thead>
          <tr className="border-b border-outline-variant text-label-md text-on-surface-variant">
            <th className="px-4 py-3 font-medium">课程</th>
            <th className="px-4 py-3 font-medium">价格</th>
            <th className="px-4 py-3 font-medium">购买时间</th>
            <th className="px-4 py-3 font-medium">交易哈希</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((purchase) => (
            <tr key={purchase.courseId} className="border-b border-outline-variant last:border-b-0">
              <td className="px-4 py-3 text-on-surface">{purchase.courseName}</td>
              <td className="px-4 py-3 font-mono text-tertiary">{purchase.priceYD} YD</td>
              <td className="px-4 py-3 text-on-surface-variant">{formatDate(purchase.purchasedAt)}</td>
              <td className="px-4 py-3">
                {/* 链上 Purchase 结构不存交易哈希，purchaseOf 查询无法回溯出历史
                    交易哈希——这里如实展示"无记录"，不假造一个不存在的哈希
                    （design.md「购买记录」模块的明确设计决定）。 */}
                <span className="font-mono text-on-surface-variant" title="链上记录未存储历史交易哈希">
                  未记录
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
