"use client";

import { AlertTriangle, Award, Loader2 } from "lucide-react";
import { useOnchainCertificates } from "@/lib/purchase/useOnchainCertificates";

export function CertificatesTab() {
  // 取代原 mockCertificates 静态展示，改接 [[16.onchain-completion-certificate]]
  // 的真实链上证书查询——与 PurchasedCoursesTab/PurchaseRecordsTab 替换 Mock 时
  // 同样的原则：loading/error 必须有独立展示位，不能把"还没读到"或"读取失败"
  // 都折叠成"暂无证书"，那会让已获得证书的用户误以为自己什么都没有。
  const { certificates, loading, error } = useOnchainCertificates();

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-stack-lg text-body-md text-on-surface-variant">
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
        读取链上证书...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-stack-lg text-body-md text-error">
        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
        读取链上证书失败：{error}
      </div>
    );
  }

  if (certificates.length === 0) {
    return <p className="text-body-md text-on-surface-variant">暂无 NFT 证书，完成课程后即可铸造。</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-stack-md sm:grid-cols-2">
      {certificates.map((cert) => (
        <div
          key={cert.tokenId}
          className="rounded-lg bg-gradient-to-br from-primary via-secondary to-tertiary p-[2px] shadow-[0_0_24px_-6px] shadow-primary/50"
        >
          <div className="flex flex-col items-center gap-2 rounded-lg bg-surface-container p-6 text-center">
            <Award className="size-10 text-secondary" aria-hidden="true" />
            <h3 className="font-heading text-headline-md text-on-surface">{cert.courseName}</h3>
            <p className="font-mono text-label-md text-on-surface-variant">
              Token ID: #{cert.tokenId}
            </p>
            {/* ownerOf 读取的真实拥有者地址——用于验证"这枚 NFT 确实在我账户名下"这个
                真实性展示，不是从 Mock 数据里假设（design.md 模块 3）。 */}
            <p className="truncate text-label-md font-mono text-on-surface-variant" title={cert.owner}>
              拥有者：{cert.owner}
            </p>
            <p className="text-label-md text-on-surface-variant">
              完成时间：
              {new Date(cert.completedAt).toLocaleString("zh-CN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
            <p
              className="w-full truncate text-label-md font-mono text-on-surface-variant"
              title={cert.tokenURI}
            >
              Token URI: {cert.tokenURI}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
