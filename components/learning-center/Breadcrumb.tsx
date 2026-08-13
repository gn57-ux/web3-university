import Link from "next/link";

interface BreadcrumbProps {
  currentLabel: string;
}

// F-001 要求四级面包屑（首页 > 课程广场 > 课程分类 > 当前课程/章节），但共享 Course
// 类型没有"课程分类"字段，Mock 阶段暂不引入完整分类体系，统一用固定占位分类。
const CATEGORY_LABEL = "智能合约开发";

export function Breadcrumb({ currentLabel }: BreadcrumbProps) {
  return (
    <nav aria-label="面包屑导航" className="text-label-md text-on-surface-variant">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="hover:text-on-surface">
            首页
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link href="/courses" className="hover:text-on-surface">
            课程广场
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>{CATEGORY_LABEL}</li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="text-on-surface">
          {currentLabel}
        </li>
      </ol>
    </nav>
  );
}
