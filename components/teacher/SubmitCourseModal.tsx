"use client";

import { useState } from "react";
import type { CourseLevel } from "@/lib/mock/types";

export interface SubmitCourseFormData {
  title: string;
  description: string;
  coverUrl: string;
  priceYD: number;
  level: CourseLevel;
  chaptersOutline: string;
}

interface SubmitCourseModalProps {
  initial?: SubmitCourseFormData;
  /**
   * 编辑已上架（active）/待审核（pending）课程时传入，锁定为"保存修改"单按钮
   * （不经由本弹窗改变课程状态）——只有新建课程、或编辑草稿课程时才允许在
   * "保存草稿"/"提交审核"之间二选一，避免误将已上架/待审核课程降级为草稿。
   */
  lockedStatusLabel?: string;
  onCancel: () => void;
  onSubmit: (data: SubmitCourseFormData, action: "draft" | "pending" | "keep") => void;
}

const EMPTY_FORM: SubmitCourseFormData = {
  title: "",
  description: "",
  coverUrl: "",
  priceYD: 4,
  level: "beginner",
  chaptersOutline: "",
};

export function SubmitCourseModal({
  initial,
  lockedStatusLabel,
  onCancel,
  onSubmit,
}: SubmitCourseModalProps) {
  const [form, setForm] = useState<SubmitCourseFormData>(initial ?? EMPTY_FORM);

  const canSubmit = form.title.trim() !== "" && form.description.trim() !== "";

  function handleSave(action: "draft" | "pending" | "keep") {
    if ((action === "pending" || action === "keep") && !canSubmit) return;
    onSubmit(form, action);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-course-title"
        className="w-full max-w-lg rounded-lg border border-outline-variant bg-surface-container p-6"
      >
        <h2 id="submit-course-title" className="font-heading text-headline-md text-on-surface">
          {initial ? "编辑课程" : "提交新课程"}
        </h2>

        <div className="mt-stack-sm flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">课程名称</span>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
              className="rounded-md border border-outline-variant bg-surface py-2 px-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">课程描述</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
              rows={3}
              className="rounded-md border border-outline-variant bg-surface py-2 px-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">封面图 URL（可选）</span>
            <input
              type="text"
              value={form.coverUrl}
              onChange={(event) => setForm((f) => ({ ...f, coverUrl: event.target.value }))}
              placeholder="https://..."
              className="rounded-md border border-outline-variant bg-surface py-2 px-3 text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-label-md text-on-surface-variant">价格（YD）</span>
              <input
                type="number"
                min={0}
                value={form.priceYD}
                onChange={(event) =>
                  setForm((f) => ({ ...f, priceYD: Number(event.target.value) || 0 }))
                }
                className="rounded-md border border-outline-variant bg-surface py-2 px-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-label-md text-on-surface-variant">难度</span>
              <select
                value={form.level}
                onChange={(event) =>
                  setForm((f) => ({ ...f, level: event.target.value as CourseLevel }))
                }
                className="rounded-md border border-outline-variant bg-surface py-2 px-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="beginner">初级</option>
                <option value="intermediate">中级</option>
                <option value="expert">高级</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">章节大纲（占位，每行一个章节）</span>
            <textarea
              value={form.chaptersOutline}
              onChange={(event) =>
                setForm((f) => ({ ...f, chaptersOutline: event.target.value }))
              }
              rows={3}
              placeholder={"第一章：...\n第二章：..."}
              className="rounded-md border border-outline-variant bg-surface py-2 px-3 text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
        </div>

        {lockedStatusLabel && (
          <p className="mt-stack-sm text-label-md text-on-surface-variant">
            当前状态「{lockedStatusLabel}」不会因编辑而改变，仅保存内容修改。
          </p>
        )}

        <div className="mt-stack-md flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-outline-variant px-4 py-2 text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container-high"
          >
            取消
          </button>
          {lockedStatusLabel ? (
            <button
              type="button"
              onClick={() => handleSave("keep")}
              disabled={!canSubmit}
              className="rounded-md bg-primary-container px-4 py-2 text-body-md font-medium text-on-primary-container transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              保存修改
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleSave("draft")}
                disabled={form.title.trim() === ""}
                className="rounded-md border border-outline-variant px-4 py-2 text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
              >
                保存草稿
              </button>
              <button
                type="button"
                onClick={() => handleSave("pending")}
                disabled={!canSubmit}
                className="rounded-md bg-primary-container px-4 py-2 text-body-md font-medium text-on-primary-container transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                提交审核
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
