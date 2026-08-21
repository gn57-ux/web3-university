"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Breadcrumb } from "./Breadcrumb";
import { CodeSnippet } from "./CodeSnippet";
import { CommentSection } from "./CommentSection";
import { CompletionBanner } from "./CompletionBanner";
import { LessonList } from "./LessonList";
import { MockVideoPlayer } from "./MockVideoPlayer";
import { ProgressBar } from "./ProgressBar";
import { PurchaseRequiredGate } from "./PurchaseRequiredGate";
import { mockComments } from "@/lib/mock/comments";
import type { Lesson } from "@/lib/mock/types";
import { useWallet } from "@/lib/wallet/useWallet";
import { useContractClients } from "@/lib/contracts/useContractClients";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { TARGET_CHAIN } from "@/lib/contracts/chain";
import { Web3UniversityAbi } from "@/lib/contracts/abis/Web3University";
import { getOnchainCourseId } from "@/lib/contracts/courseIdMap";
import { toContractErrorMessage } from "@/lib/contracts/txError";

interface LearningCenterProps {
  courseId: string;
  courseTitle: string;
  lessons: Lesson[];
}

const INITIAL_COMPLETED = 3;

export function LearningCenter({ courseId, courseTitle, lessons }: LearningCenterProps) {
  // 购课门禁改读链上 `Web3University.hasPurchased`（只读，不需要 walletClient/
  // 登录也能读，但需要"当前是谁"才能查询——未登录 address 为 null 时视为未购买，
  // 与替换前的行为一致）。链上读取是异步的，用一个显式的 "checking" 态避免在
  // 首次读取完成前把"还不知道"误判成"未购买"进而闪现购课引导页；读取失败
  // （RPC 错误等）也必须是独立的显式态，不能等同于"未购买"——否则一次网络抖动
  // 就会把已购买用户拦在购课引导页外，而不是提示重试（design.md「安全考虑」
  // 对"读取失败/读取中不能默认落到看似正常档位"的要求，Codex Review 结构化
  // 复核抓到的问题：初版把读取失败也归并进 purchased: false）。
  const { address } = useWallet();
  const { publicClient } = useContractClients();
  // purchaseCheck 记录的是"结果对应哪个查询键"（key），不只是状态本身——
  // 账户/课程切换时，effect 里用 queueMicrotask 延后 setState（react-hooks/
  // set-state-in-effect 规则要求），但 React 在这次微任务执行前会先用旧的
  // purchaseCheck.status 同步渲染一帧：如果上一个账户/课程已购买，这一帧会
  // 把完整课程内容（含 MockVideoPlayer/CodeSnippet）渲染出来，哪怕新的
  // 账户/课程实际未购买（Codex Review 结构化复核第四轮抓到的 P2）。用 key
  // 在渲染期同步比对，key 不匹配就视为 checking，不依赖 effect 的微任务时机。
  const [purchaseCheck, setPurchaseCheck] = useState<{
    key: string;
    status: "checking" | "purchased" | "not-purchased" | "error";
    error?: string;
  }>({ key: "", status: "checking" });
  const [retryToken, setRetryToken] = useState(0);

  const queryKey = `${address ?? "anon"}::${courseId}`;

  useEffect(() => {
    let cancelled = false;
    const key = `${address ?? "anon"}::${courseId}`;

    if (!address) {
      // react-hooks/set-state-in-effect：不能在 effect 主体同步调用 setState，
      // 用 queueMicrotask 延后（与 useContractClients.ts 的同类分支保持一致）；
      // 渲染期的 key 比对（见上方注释）已经挡住了这段延迟期间的误渲染。
      queueMicrotask(() => {
        if (!cancelled) setPurchaseCheck({ key, status: "not-purchased" });
      });
      return () => {
        cancelled = true;
      };
    }

    let onchainCourseId: bigint;
    try {
      onchainCourseId = getOnchainCourseId(courseId);
    } catch {
      // 未知 slug（理论上不会发生，见 courseIdMap.ts）：保守地当作未购买处理，
      // 不让一个无法解析 courseId 的课程绕过购课门禁。
      queueMicrotask(() => {
        if (!cancelled) setPurchaseCheck({ key, status: "not-purchased" });
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (!cancelled) setPurchaseCheck({ key, status: "checking" });
    });
    publicClient
      .readContract({
        address: CONTRACT_ADDRESSES[TARGET_CHAIN.id].Web3University,
        abi: Web3UniversityAbi,
        functionName: "hasPurchased",
        args: [onchainCourseId, address as `0x${string}`],
      })
      .then((purchased) => {
        if (!cancelled) {
          setPurchaseCheck({ key, status: purchased ? "purchased" : "not-purchased" });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setPurchaseCheck({ key, status: "error", error: toContractErrorMessage(e) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, courseId, publicClient, retryToken]);

  // key 不匹配（查询键已经变化，但上面 effect 的 queueMicrotask 还没来得及
  // 提交新状态）时，无论 purchaseCheck.status 之前是什么，一律按 checking
  // 处理，避免用旧查询键的 "purchased" 结果渲染出新查询键不该看到的课程内容。
  const effectiveStatus = purchaseCheck.key === queryKey ? purchaseCheck.status : "checking";

  const sortedLessons = useMemo(() => [...lessons].sort((a, b) => a.order - b.order), [lessons]);
  const [completedCount, setCompletedCount] = useState(() =>
    Math.min(INITIAL_COMPLETED, sortedLessons.length)
  );

  if (effectiveStatus === "checking") {
    return (
      <div className="container-app flex flex-col items-center gap-stack-md py-stack-lg">
        <Breadcrumb currentLabel={courseTitle} />
        <div className="flex items-center gap-2 py-stack-lg text-body-md text-on-surface-variant">
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
          读取链上购买状态...
        </div>
      </div>
    );
  }

  if (effectiveStatus === "error") {
    // 读取失败必须是独立于"未购买"的展示态：不能让一次 RPC 抖动就把已购买
    // 用户拦在购课引导页外，必须给出明确的重试入口。
    return (
      <div className="container-app flex flex-col items-center gap-stack-md py-stack-lg">
        <Breadcrumb currentLabel={courseTitle} />
        <div className="flex flex-col items-center gap-stack-sm rounded-lg border border-outline-variant bg-surface-container p-stack-lg text-center">
          <AlertTriangle className="size-8 shrink-0 text-error" aria-hidden="true" />
          <p className="text-body-md text-on-surface">
            读取链上购买状态失败：{purchaseCheck.error}
          </p>
          <button
            type="button"
            onClick={() => setRetryToken((token) => token + 1)}
            className="rounded-md bg-primary-container px-4 py-2 text-body-md font-medium text-on-primary-container transition-colors hover:opacity-90"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (effectiveStatus === "not-purchased") {
    return (
      <div className="container-app flex flex-col gap-stack-md py-stack-lg">
        <Breadcrumb currentLabel={courseTitle} />
        <PurchaseRequiredGate courseId={courseId} courseTitle={courseTitle} />
      </div>
    );
  }

  const total = sortedLessons.length;
  const isComplete = completedCount >= total;
  const currentLesson = isComplete ? null : sortedLessons[completedCount];
  const percent = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  function markCurrentLessonComplete() {
    setCompletedCount((current) => Math.min(current + 1, total));
  }

  return (
    <div className="container-app py-stack-lg">
      <Breadcrumb currentLabel={currentLesson?.title ?? courseTitle} />
      <h1 className="mt-stack-sm font-heading text-headline-lg text-on-surface">
        {currentLesson?.title ?? courseTitle}
      </h1>

      {/* AC-001 要求视觉/文档顺序为 面包屑→视频区→代码示例→章节进度→评论。桌面态章节进度
          在右侧栏，但移动端各区块按源码顺序纵向堆叠，因此章节进度这块必须在 DOM 里排在
          评论前面，靠 lg:col-start-2/row-span-2 把它挪到桌面右侧栏（同 course-detail 的
          PurchasePanel 处理方式），不能靠"两个并列 flex 列"实现（那样移动端堆叠顺序会
          与文档顺序相反）。 */}
      <div className="mt-stack-md grid grid-cols-1 gap-stack-md lg:grid-cols-[1fr_320px]">
        <div className="lg:col-start-1 lg:row-start-1">
          {isComplete || !currentLesson ? (
            <CompletionBanner />
          ) : (
            <div className="flex flex-col gap-stack-md">
              <MockVideoPlayer
                key={currentLesson.id}
                title={currentLesson.title}
                durationMinutes={currentLesson.durationMinutes}
              />
              <CodeSnippet />
            </div>
          )}
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container p-4 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-start">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-headline-md text-on-surface">课程进度</h2>
            <span className="rounded-full bg-secondary-container px-2 py-0.5 font-mono text-label-md text-on-secondary-container">
              {percent}%
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar percent={percent} />
          </div>
          <p className="mt-1 text-label-md text-on-surface-variant">
            {completedCount} / {total} 个模块已完成
          </p>

          <LessonList lessons={sortedLessons} completedCount={completedCount} />

          {!isComplete && (
            <button
              type="button"
              onClick={markCurrentLessonComplete}
              className="mt-stack-sm w-full rounded-md border border-outline-variant py-2 text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container-high"
            >
              标记本章完成（演示）
            </button>
          )}
        </div>

        <div className="lg:col-start-1 lg:row-start-2">
          <CommentSection initialComments={mockComments} />
        </div>
      </div>
    </div>
  );
}
