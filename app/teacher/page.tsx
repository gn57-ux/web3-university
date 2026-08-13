"use client";

import { useState } from "react";
import { CourseAnalyticsModal } from "@/components/teacher/CourseAnalyticsModal";
import { COURSE_STATUS_LABEL } from "@/components/teacher/courseStatus";
import { EmptyState } from "@/components/teacher/EmptyState";
import { SubmitCourseModal, type SubmitCourseFormData } from "@/components/teacher/SubmitCourseModal";
import { TeacherCourseCard } from "@/components/teacher/TeacherCourseCard";
import { TeacherWelcome } from "@/components/teacher/TeacherWelcome";
import { initialTeacherCourses, mockTeacherName, type TeacherCourseView } from "@/lib/mock/teacherFixtures";
import type { CourseStatus } from "@/lib/mock/types";

function estimateDraftCompleteness(form: SubmitCourseFormData): number {
  const fields = [form.title, form.description, form.coverUrl, form.chaptersOutline];
  const filled = fields.filter((value) => value.trim() !== "").length;
  return Math.round((filled / fields.length) * 100);
}

function canSubmitForReview(course: TeacherCourseView): boolean {
  return course.title.trim() !== "" && course.description.trim() !== "";
}

export default function TeacherWorkspacePage() {
  const [courses, setCourses] = useState<TeacherCourseView[]>(initialTeacherCourses);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<TeacherCourseView | null>(null);
  const [analyticsCourse, setAnalyticsCourse] = useState<TeacherCourseView | null>(null);

  const courseCount = courses.length;
  const totalStudents = courses.reduce((sum, course) => sum + course.enrolledCount, 0);
  const pendingCount = courses.filter((course) => course.status === "pending").length;

  // 已上架/待审核课程的编辑不允许通过表单把状态改回草稿/待审核（否则会把一门
  // 已上架课程误降级），弹窗改为单一"保存修改"按钮，锁定原状态。只有新建课程、
  // 或编辑草稿课程时才允许在"保存草稿"/"提交审核"之间二选一。
  const lockedStatusLabel =
    editingCourse && editingCourse.status !== "draft"
      ? COURSE_STATUS_LABEL[editingCourse.status]
      : undefined;

  function openSubmitForm() {
    setEditingCourse(null);
    setFormOpen(true);
  }

  function openEditForm(course: TeacherCourseView) {
    setEditingCourse(course);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingCourse(null);
  }

  function handleFormSubmit(data: SubmitCourseFormData, action: "draft" | "pending" | "keep") {
    if (editingCourse) {
      setCourses((current) =>
        current.map((course) => {
          if (course.id !== editingCourse.id) return course;

          const base = {
            ...course,
            title: data.title,
            description: data.description,
            coverUrl: data.coverUrl,
            priceYD: data.priceYD,
            level: data.level,
            chaptersOutline: data.chaptersOutline,
          };

          if (action === "keep") {
            // 保存修改但不改变状态，草稿/待审核/进度等展示字段维持原值。
            return base;
          }
          return {
            ...base,
            status: action,
            draftCompleteness: action === "draft" ? estimateDraftCompleteness(data) : undefined,
            lastEditedLabel: action === "draft" ? "刚刚" : undefined,
            submittedDaysAgo: action === "pending" ? 0 : undefined,
          };
        })
      );
    } else {
      // 新建课程时 lockedStatusLabel 恒为 undefined，弹窗不会传回 "keep"；
      // 这里的 fallback 只是让 CourseStatus 类型收窄，实际不会走到。
      const status: CourseStatus = action === "keep" ? "draft" : action;
      const newCourse: TeacherCourseView = {
        id: crypto.randomUUID(),
        title: data.title,
        teacher: mockTeacherName,
        priceYD: data.priceYD,
        level: data.level,
        coverUrl: data.coverUrl,
        enrolledCount: 0,
        status,
        description: data.description,
        chaptersOutline: data.chaptersOutline,
        draftCompleteness: status === "draft" ? estimateDraftCompleteness(data) : undefined,
        lastEditedLabel: status === "draft" ? "刚刚" : undefined,
        submittedDaysAgo: status === "pending" ? 0 : undefined,
      };
      setCourses((current) => [newCourse, ...current]);
    }
    closeForm();
  }

  function submitForReview(courseId: string) {
    setCourses((current) =>
      current.map((course) =>
        course.id === courseId && course.status === "draft" && canSubmitForReview(course)
          ? { ...course, status: "pending", submittedDaysAgo: 0, draftCompleteness: undefined }
          : course
      )
    );
  }

  return (
    <div className="container-app py-stack-lg">
      <TeacherWelcome
        teacherName={mockTeacherName}
        courseCount={courseCount}
        totalStudents={totalStudents}
        pendingCount={pendingCount}
        onSubmitNew={openSubmitForm}
      />

      <h2 className="mt-stack-lg font-heading text-headline-lg text-on-surface">我的课程</h2>

      {courses.length === 0 ? (
        <div className="mt-stack-md">
          <EmptyState onSubmitNew={openSubmitForm} />
        </div>
      ) : (
        <div className="mt-stack-md grid grid-cols-1 gap-stack-md sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <TeacherCourseCard
              key={course.id}
              course={course}
              onEdit={openEditForm}
              onSubmitForReview={submitForReview}
              onViewAnalytics={setAnalyticsCourse}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <SubmitCourseModal
          initial={
            editingCourse
              ? {
                  title: editingCourse.title,
                  description: editingCourse.description,
                  coverUrl: editingCourse.coverUrl,
                  priceYD: editingCourse.priceYD,
                  level: editingCourse.level,
                  chaptersOutline: editingCourse.chaptersOutline ?? "",
                }
              : undefined
          }
          lockedStatusLabel={lockedStatusLabel}
          onCancel={closeForm}
          onSubmit={handleFormSubmit}
        />
      )}

      {analyticsCourse && (
        <CourseAnalyticsModal course={analyticsCourse} onClose={() => setAnalyticsCourse(null)} />
      )}
    </div>
  );
}
