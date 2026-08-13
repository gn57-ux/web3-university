"use client";

import { useState } from "react";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminSidebar, type AdminSection } from "@/components/admin/AdminSidebar";
import { CompletionConfirmation } from "@/components/admin/CompletionConfirmation";
import { CourseReviewQueue } from "@/components/admin/CourseReviewQueue";
import { DemoModeBanner } from "@/components/admin/DemoModeBanner";
import { TeacherWhitelistTable } from "@/components/admin/TeacherWhitelistTable";
import {
  initialCompletionRequests,
  initialPendingCourses,
  type CompletionRequest,
  type PendingCourse,
} from "@/lib/mock/adminFixtures";
import { mockTeacherApplications } from "@/lib/mock/fixtures";
import type { TeacherApplication } from "@/lib/mock/types";

const SECTION_TITLE: Record<AdminSection, string> = {
  overview: "概览",
  teachers: "老师管理",
  courses: "课程审核",
  completion: "完课确认",
  settings: "设置",
};

function todayLabel() {
  // toISOString() 转 UTC，本地时区为负偏移（如美西）时傍晚新增会被记成明天，
  // 改用本地年月日拼接。
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AdminDashboardPage() {
  const [section, setSection] = useState<AdminSection>("courses");
  const [reviewCourses, setReviewCourses] = useState<PendingCourse[]>(initialPendingCourses);
  const [teachers, setTeachers] = useState<TeacherApplication[]>(mockTeacherApplications);
  const [completionRequests, setCompletionRequests] =
    useState<CompletionRequest[]>(initialCompletionRequests);

  const pendingCourses = reviewCourses.filter((course) => course.status === "pending");
  const approvedCourses = reviewCourses.filter((course) => course.status === "active");
  const mintableCount = completionRequests.filter(
    (request) => request.completionPercent >= 100 && !request.minted
  ).length;

  function handleApprove(id: string) {
    setReviewCourses((current) =>
      current.map((course) => (course.id === id ? { ...course, status: "active" } : course))
    );
  }

  function handleReject(id: string) {
    setReviewCourses((current) => current.filter((course) => course.id !== id));
  }

  function handleAddTeacher(address: string) {
    setTeachers((current) => [...current, { address, addedAt: todayLabel(), active: true }]);
  }

  function handleRemoveTeacher(address: string) {
    setTeachers((current) => current.filter((teacher) => teacher.address !== address));
  }

  function handleMinted(studentAddress: string, courseId: string) {
    setCompletionRequests((current) =>
      current.map((request) =>
        request.studentAddress === studentAddress && request.courseId === courseId
          ? { ...request, minted: true }
          : request
      )
    );
  }

  return (
    <div className="container-app py-stack-lg">
      <h1 className="font-heading text-headline-lg text-on-surface">Owner 后台</h1>
      <div className="mt-stack-sm">
        <DemoModeBanner />
      </div>

      <div className="mt-stack-md flex flex-col gap-stack-md lg:flex-row">
        <AdminSidebar active={section} onSelect={setSection} />

        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-headline-lg text-on-surface">
            {SECTION_TITLE[section]}
          </h2>

          <div className="mt-stack-sm">
            {section === "overview" && (
              <AdminOverview
                pendingCourseCount={pendingCourses.length}
                teacherCount={teachers.length}
                mintableCount={mintableCount}
              />
            )}

            {section === "teachers" && (
              <TeacherWhitelistTable
                teachers={teachers}
                onAdd={handleAddTeacher}
                onRemove={handleRemoveTeacher}
              />
            )}

            {section === "courses" && (
              <CourseReviewQueue
                pendingCourses={pendingCourses}
                approvedCourses={approvedCourses}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            )}

            {section === "completion" && (
              <CompletionConfirmation requests={completionRequests} onMinted={handleMinted} />
            )}

            {section === "settings" && (
              <p className="text-body-md text-on-surface-variant">演示模式下暂无可配置项。</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
