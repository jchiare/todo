"use client";

export function ProgressBar({
  progress,
  className = "",
}: {
  progress: number;
  className?: string;
}) {
  return (
    <div className={`h-1.5 w-full rounded-full bg-sage-100 ${className}`}>
      <div
        className="h-full rounded-full bg-sage-400 transition-all duration-500 ease-out"
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
    </div>
  );
}
