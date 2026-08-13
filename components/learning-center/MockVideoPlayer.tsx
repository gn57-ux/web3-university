"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface MockVideoPlayerProps {
  title: string;
  durationMinutes: number;
}

// 切换到下一课时播放进度需要重置。不用 useEffect 监听 title 变化后同步 setState
// （会命中 eslint-plugin-react-hooks 的 set-state-in-effect 规则），调用方改为用
// key={lesson.id} 让组件在换课时整体重新挂载，state 天然重置。

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function MockVideoPlayer({ title, durationMinutes }: MockVideoPlayerProps) {
  const durationSeconds = durationMinutes * 60;
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) return;
    intervalRef.current = setInterval(() => {
      setElapsed((current) => {
        const next = current + 1;
        if (next >= durationSeconds) {
          setPlaying(false);
          return durationSeconds;
        }
        return next;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, durationSeconds]);

  return (
    <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container">
      <div className="relative flex aspect-video w-full items-center justify-center bg-surface-container-high">
        <span className="absolute left-4 top-4 font-mono text-label-md text-on-surface-variant">
          学习中心 · {title}
        </span>
        <button
          type="button"
          onClick={() => setPlaying((current) => !current)}
          aria-label={playing ? "暂停视频（Mock）" : "播放视频（Mock）"}
          className="flex size-16 items-center justify-center rounded-full bg-primary-container text-on-primary-container transition-transform hover:scale-105"
        >
          {playing ? (
            <Pause className="size-7" aria-hidden="true" />
          ) : (
            <Play className="ml-0.5 size-7" aria-hidden="true" />
          )}
        </button>
      </div>
      <div className="flex items-center justify-between px-4 py-2 font-mono text-label-md text-on-surface-variant">
        <span>{formatTime(elapsed)}</span>
        <span>{formatTime(durationSeconds)}</span>
      </div>
    </div>
  );
}
