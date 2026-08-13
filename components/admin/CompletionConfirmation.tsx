"use client";

import { Award, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CompletionRequest } from "@/lib/mock/adminFixtures";
import { AdminTable, AdminTableBody, AdminTableHeaderRow } from "./AdminTable";

const MINT_DELAY_MS = 1200;

interface CompletionConfirmationProps {
  requests: CompletionRequest[];
  onMinted: (studentAddress: string, courseId: string) => void;
}

function requestKey(studentAddress: string, courseId: string) {
  return `${studentAddress}:${courseId}`;
}

export function CompletionConfirmation({ requests, onMinted }: CompletionConfirmationProps) {
  // 每一行的铸造状态/定时器都要独立追踪（Set/Map，而不是单个值），否则同时对
  // 两行点"铸造 NFT"时，后点的会覆盖先点的 loading 态、卸载时也只清得掉最后
  // 一个 timer，更早的 timer 仍会在组件卸载后触发 setState。
  const [mintingKeys, setMintingKeys] = useState<Set<string>>(new Set());
  const mintTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = mintTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  function handleMint(request: CompletionRequest) {
    const key = requestKey(request.studentAddress, request.courseId);
    setMintingKeys((current) => new Set(current).add(key));
    const timer = setTimeout(() => {
      setMintingKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
      mintTimers.current.delete(key);
      onMinted(request.studentAddress, request.courseId);
    }, MINT_DELAY_MS);
    mintTimers.current.set(key, timer);
  }

  if (requests.length === 0) {
    return <p className="text-body-md text-on-surface-variant">暂无完课确认请求。</p>;
  }

  return (
    <AdminTable>
      <AdminTableHeaderRow>
        <th className="px-4 py-3 font-medium">Student</th>
        <th className="px-4 py-3 font-medium">Course</th>
        <th className="px-4 py-3 font-medium">Completion</th>
        <th className="px-4 py-3 font-medium">Actions</th>
      </AdminTableHeaderRow>
      <AdminTableBody>
        {requests.map((request) => {
          const key = requestKey(request.studentAddress, request.courseId);
          const isMinting = mintingKeys.has(key);
          const canMint = request.completionPercent >= 100 && !request.minted;

          return (
            <tr key={key}>
              <td className="px-4 py-3 font-mono text-on-surface">{request.studentAddress}</td>
              <td className="px-4 py-3 text-on-surface-variant">{request.courseName}</td>
              <td className="px-4 py-3 font-mono text-on-surface-variant">
                {request.completionPercent}%
              </td>
              <td className="px-4 py-3">
                {request.minted ? (
                  <span className="flex items-center gap-1.5 font-mono text-label-md text-secondary">
                    <Award className="size-4" aria-hidden="true" />
                    已铸造
                  </span>
                ) : canMint ? (
                  <button
                    type="button"
                    onClick={() => handleMint(request)}
                    disabled={isMinting}
                    className="flex items-center gap-1.5 rounded-md bg-primary-container px-3 py-1.5 text-label-md font-medium text-on-primary-container transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isMinting ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        铸造中...
                      </>
                    ) : (
                      "铸造 NFT"
                    )}
                  </button>
                ) : (
                  <span className="text-label-md text-on-surface-variant">未完成课程</span>
                )}
              </td>
            </tr>
          );
        })}
      </AdminTableBody>
    </AdminTable>
  );
}
