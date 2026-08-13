"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { TeacherApplication } from "@/lib/mock/types";
import { AdminTable, AdminTableBody, AdminTableHeaderRow } from "./AdminTable";

interface TeacherWhitelistTableProps {
  teachers: TeacherApplication[];
  onAdd: (address: string) => void;
  onRemove: (address: string) => void;
}

export function TeacherWhitelistTable({ teachers, onAdd, onRemove }: TeacherWhitelistTableProps) {
  const [addressInput, setAddressInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    const trimmed = addressInput.trim();
    if (!trimmed) return;

    // 地址重复会导致列表里出现两个相同的 React key（渲染警告），且删除操作
    // 按地址过滤时会把两条同址记录一起删掉——用大小写不敏感比较拒绝重复添加。
    const isDuplicate = teachers.some(
      (teacher) => teacher.address.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setError("该地址已在白名单中。");
      return;
    }

    setError(null);
    onAdd(trimmed);
    setAddressInput("");
  }

  return (
    <div className="flex flex-col gap-stack-sm">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={addressInput}
          onChange={(event) => {
            setAddressInput(event.target.value);
            setError(null);
          }}
          placeholder="Teacher Wallet Address (0x...)"
          aria-label="老师钱包地址"
          className="flex-1 rounded-md border border-outline-variant bg-surface-container py-2 px-3 font-mono text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={addressInput.trim() === ""}
          className="shrink-0 rounded-md bg-primary-container px-4 py-2 text-body-md font-medium text-on-primary-container transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add to Whitelist
        </button>
      </div>

      {error && (
        <p role="alert" className="text-label-md text-error">
          {error}
        </p>
      )}

      {teachers.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">白名单目前没有老师地址。</p>
      ) : (
        <AdminTable>
          <AdminTableHeaderRow>
            <th className="px-4 py-3 font-medium">Address</th>
            <th className="px-4 py-3 font-medium">Added Date</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </AdminTableHeaderRow>
          <AdminTableBody>
            {teachers.map((teacher) => (
              <tr key={teacher.address}>
                <td className="px-4 py-3 font-mono text-on-surface">{teacher.address}</td>
                <td className="px-4 py-3 text-on-surface-variant">{teacher.addedAt}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-label-md ${
                      teacher.active
                        ? "bg-secondary-container text-on-secondary-container"
                        : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {teacher.active ? "启用" : "已停用"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onRemove(teacher.address)}
                    aria-label={`移除 ${teacher.address}`}
                    className="flex size-8 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>
      )}
    </div>
  );
}
