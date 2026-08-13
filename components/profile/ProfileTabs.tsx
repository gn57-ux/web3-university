"use client";

import { useState } from "react";
import { CertificatesTab } from "./CertificatesTab";
import { LearningProgressTab } from "./LearningProgressTab";
import { PurchasedCoursesTab } from "./PurchasedCoursesTab";
import { PurchaseRecordsTab } from "./PurchaseRecordsTab";

type TabKey = "purchased" | "progress" | "certificates" | "records";

const TABS: { key: TabKey; label: string }[] = [
  { key: "purchased", label: "已购课程" },
  { key: "progress", label: "学习进度" },
  { key: "certificates", label: "NFT 证书" },
  { key: "records", label: "购买记录" },
];

export function ProfileTabs() {
  const [active, setActive] = useState<TabKey>("purchased");

  return (
    <div className="mt-stack-md grid grid-cols-1 gap-stack-md lg:grid-cols-[200px_1fr]">
      <nav
        aria-label="个人中心分类"
        className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            aria-current={active === tab.key ? "page" : undefined}
            className={`shrink-0 rounded-md px-4 py-2 text-left text-body-md font-medium transition-colors ${
              active === tab.key
                ? "bg-primary-container text-on-primary-container"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div>
        {active === "purchased" && <PurchasedCoursesTab />}
        {active === "progress" && <LearningProgressTab />}
        {active === "certificates" && <CertificatesTab />}
        {active === "records" && <PurchaseRecordsTab />}
      </div>
    </div>
  );
}
