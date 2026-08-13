import { Award } from "lucide-react";
import { mockCertificates } from "@/lib/mock/fixtures";

export function CertificatesTab() {
  if (mockCertificates.length === 0) {
    return <p className="text-body-md text-on-surface-variant">暂无 NFT 证书，完成课程后即可铸造。</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-stack-md sm:grid-cols-2">
      {mockCertificates.map((cert) => (
        <div
          key={cert.tokenId}
          className="rounded-lg bg-gradient-to-br from-primary via-secondary to-tertiary p-[2px] shadow-[0_0_24px_-6px] shadow-primary/50"
        >
          <div className="flex flex-col items-center gap-2 rounded-lg bg-surface-container p-6 text-center">
            <Award className="size-10 text-secondary" aria-hidden="true" />
            <h3 className="font-heading text-headline-md text-on-surface">{cert.courseName}</h3>
            <p className="font-mono text-label-md text-on-surface-variant">Token ID: #{cert.tokenId}</p>
            <button
              type="button"
              className="mt-2 w-full rounded-md border border-outline-variant py-2 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-high"
            >
              在区块浏览器查看
            </button>
            <p className="text-label-md text-on-surface-variant">（演示模式，不跳转真实链上浏览器）</p>
          </div>
        </div>
      ))}
    </div>
  );
}
