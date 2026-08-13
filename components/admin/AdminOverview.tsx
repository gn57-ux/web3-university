interface AdminOverviewProps {
  pendingCourseCount: number;
  teacherCount: number;
  mintableCount: number;
}

export function AdminOverview({
  pendingCourseCount,
  teacherCount,
  mintableCount,
}: AdminOverviewProps) {
  return (
    <div className="grid grid-cols-1 gap-stack-sm sm:grid-cols-3">
      <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
        <p className="text-label-md text-on-surface-variant">待审核课程</p>
        <p className="mt-1 font-heading text-headline-lg text-on-surface">{pendingCourseCount}</p>
      </div>
      <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
        <p className="text-label-md text-on-surface-variant">白名单老师</p>
        <p className="mt-1 font-heading text-headline-lg text-on-surface">{teacherCount}</p>
      </div>
      <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
        <p className="text-label-md text-on-surface-variant">待铸造证书</p>
        <p className="mt-1 font-heading text-headline-lg text-on-surface">{mintableCount}</p>
      </div>
    </div>
  );
}
