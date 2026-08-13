"use client";

import { useProfilePurchases } from "@/lib/purchase/useProfilePurchases";

function truncateHash(hash: string) {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" });
}

export function PurchaseRecordsTab() {
  const purchases = useProfilePurchases();

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
            <tr key={purchase.txHash} className="border-b border-outline-variant last:border-b-0">
              <td className="px-4 py-3 text-on-surface">{purchase.courseName}</td>
              <td className="px-4 py-3 font-mono text-tertiary">{purchase.priceYD} YD</td>
              <td className="px-4 py-3 text-on-surface-variant">{formatDate(purchase.purchasedAt)}</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  className="font-mono text-on-surface-variant underline decoration-dotted hover:text-primary"
                  title="演示模式，不跳转真实区块浏览器"
                >
                  {truncateHash(purchase.txHash)}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
