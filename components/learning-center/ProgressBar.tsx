interface ProgressBarProps {
  percent: number;
}

export function ProgressBar({ percent }: ProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high"
    >
      <div
        className="h-full rounded-full bg-secondary transition-[width]"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
