"use client";

import { useEffect, useRef, useState } from "react";

const SIGN_DELAY_MS = 1000;

interface EditUsernameModalProps {
  currentUsername: string;
  onConfirm: (newUsername: string) => void;
  onCancel: () => void;
}

export function EditUsernameModal({
  currentUsername,
  onConfirm,
  onCancel,
}: EditUsernameModalProps) {
  const [draft, setDraft] = useState(currentUsername);
  const [signing, setSigning] = useState(false);
  const signTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (signTimer.current) clearTimeout(signTimer.current);
    };
  }, []);

  function handleConfirm() {
    const trimmed = draft.trim();
    if (!trimmed || signing) return;
    setSigning(true);
    signTimer.current = setTimeout(() => {
      onConfirm(trimmed);
    }, SIGN_DELAY_MS);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-username-title"
        className="w-full max-w-sm rounded-lg border border-outline-variant bg-surface-container p-6"
      >
        <h2 id="edit-username-title" className="font-heading text-headline-md text-on-surface">
          修改用户名
        </h2>

        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={signing}
          aria-label="新用户名"
          className="mt-stack-sm w-full rounded-md border border-outline-variant bg-surface py-2 px-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
        />

        {signing && (
          <p className="mt-2 text-label-md text-on-surface-variant" aria-live="polite">
            等待钱包签名确认...
          </p>
        )}

        <div className="mt-stack-md flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={signing}
            className="rounded-md border border-outline-variant px-4 py-2 text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={signing || draft.trim() === ""}
            className="rounded-md bg-primary-container px-4 py-2 text-body-md font-medium text-on-primary-container transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {signing ? "签名中..." : "钱包签名确认"}
          </button>
        </div>
      </div>
    </div>
  );
}
