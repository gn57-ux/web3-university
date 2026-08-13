"use client";

import { useRef, useState, type FormEvent } from "react";
import type { Comment } from "@/lib/mock/comments";

interface CommentSectionProps {
  initialComments: Comment[];
}

export function CommentSection({ initialComments }: CommentSectionProps) {
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState("");
  const nextIdRef = useRef(1);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;

    const newComment: Comment = {
      id: `local-${nextIdRef.current++}`,
      author: "你",
      content,
      postedAt: "刚刚",
    };
    setComments((current) => [newComment, ...current]);
    setDraft("");
  }

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container p-4">
      <h2 className="font-heading text-headline-md text-on-surface">学员评论</h2>
      <p className="mt-1 text-label-md text-on-surface-variant">
        当前为演示模式，评论仅保存在本次浏览会话中，不会持久化。
      </p>

      <form onSubmit={handleSubmit} className="mt-stack-sm flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="写下你的评论..."
          aria-label="发表评论"
          className="flex-1 rounded-md border border-outline-variant bg-surface py-2 px-3 text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={draft.trim() === ""}
          className="rounded-md bg-primary-container px-4 py-2 text-body-md font-medium text-on-primary-container transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          发布
        </button>
      </form>

      <ul className="mt-stack-md flex flex-col gap-4">
        {comments.map((comment) => (
          <li key={comment.id} className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high font-mono text-label-md text-on-surface-variant">
              {comment.author.slice(0, 2)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-label-md text-on-surface">{comment.author}</span>
                <span className="text-label-md text-on-surface-variant">{comment.postedAt}</span>
              </div>
              <p className="mt-0.5 text-body-md text-on-surface">{comment.content}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
