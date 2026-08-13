import type { ReactNode } from "react";

// 供老师白名单 / 完课确认两处表格复用（F-005：无竖线、仅细横向分隔线、
// 表头用 JetBrains Mono），避免两处样式各写一份逐渐产生偏差。课程审核队列
// 需要展示封面图与长描述，用卡片网格而非表格，不引用本组件（见 design.md 模块 2）。

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant">
      <table className="w-full min-w-[560px] text-left text-body-md">{children}</table>
    </div>
  );
}

export function AdminTableHeaderRow({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-outline-variant text-label-md font-mono text-on-surface-variant">
        {children}
      </tr>
    </thead>
  );
}

export function AdminTableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-outline-variant">{children}</tbody>;
}
