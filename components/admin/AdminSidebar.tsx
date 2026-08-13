import { Award, LayoutDashboard, Settings, ShieldCheck, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AdminSection = "overview" | "teachers" | "courses" | "completion" | "settings";

const SECTIONS: { key: AdminSection; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "概览", icon: LayoutDashboard },
  { key: "teachers", label: "老师管理", icon: UsersRound },
  { key: "courses", label: "课程审核", icon: ShieldCheck },
  { key: "completion", label: "完课确认", icon: Award },
  { key: "settings", label: "设置", icon: Settings },
];

interface AdminSidebarProps {
  active: AdminSection;
  onSelect: (section: AdminSection) => void;
}

export function AdminSidebar({ active, onSelect }: AdminSidebarProps) {
  return (
    <>
      {/* 移动端折叠为顶部下拉菜单（NFR 要求），不展示完整侧边栏 */}
      <div className="lg:hidden">
        <label htmlFor="admin-section-select" className="sr-only">
          选择管理功能
        </label>
        <select
          id="admin-section-select"
          value={active}
          onChange={(event) => onSelect(event.target.value as AdminSection)}
          className="w-full rounded-md border border-outline-variant bg-surface-container py-2 px-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {SECTIONS.map((section) => (
            <option key={section.key} value={section.key}>
              {section.label}
            </option>
          ))}
        </select>
      </div>

      {/* 桌面端：左侧垂直导航 */}
      <nav aria-label="管理后台导航" className="hidden shrink-0 lg:block lg:w-56">
        <div className="rounded-lg border border-outline-variant bg-surface-container p-3">
          <p className="px-2 text-body-md font-medium text-on-surface">Admin Portal</p>
          <p className="px-2 text-label-md text-on-surface-variant">Governance Level 4</p>
          <div className="mt-stack-sm flex flex-col gap-1">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => onSelect(section.key)}
                  aria-current={active === section.key ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-body-md font-medium transition-colors ${
                    active === section.key
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
