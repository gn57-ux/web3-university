import { Clock, Plus, Users } from "lucide-react";

interface TeacherWelcomeProps {
  teacherName: string;
  courseCount: number;
  totalStudents: number;
  pendingCount: number;
  onSubmitNew: () => void;
}

export function TeacherWelcome({
  teacherName,
  courseCount,
  totalStudents,
  pendingCount,
  onSubmitNew,
}: TeacherWelcomeProps) {
  return (
    <div>
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-headline-lg text-on-surface">
            欢迎回来, {teacherName} 老师
          </h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            管理您的课程并监控学生进度。
          </p>
        </div>
        <button
          type="button"
          onClick={onSubmitNew}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary-container px-4 py-2 text-body-md font-medium text-on-primary-container transition-colors hover:opacity-90"
        >
          <Plus className="size-4" aria-hidden="true" />
          提交新课程
        </button>
      </div>

      <div className="mt-stack-md grid grid-cols-1 gap-stack-sm sm:grid-cols-3">
        <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
          <p className="text-label-md text-on-surface-variant">课程数</p>
          <p className="mt-1 font-heading text-headline-lg text-on-surface">{courseCount}</p>
        </div>
        <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
          <p className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
            <Users className="size-3.5" aria-hidden="true" />
            学生总数
          </p>
          <p className="mt-1 font-heading text-headline-lg text-on-surface">
            {totalStudents.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-tertiary bg-tertiary-container p-4">
          <p className="flex items-center gap-1.5 text-label-md text-on-tertiary-container">
            <Clock className="size-3.5" aria-hidden="true" />
            待处理
          </p>
          <p className="mt-1 font-heading text-headline-lg text-on-tertiary-container">
            {pendingCount}
          </p>
        </div>
      </div>
    </div>
  );
}
