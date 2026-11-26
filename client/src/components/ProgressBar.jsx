import React from 'react';

export default function ProgressBar({ current, total }) {
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Question {current} of {total}</span>
        <span className="text-zinc-900 dark:text-white font-semibold">{Math.round(pct)}%</span>
      </div>
      <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-zinc-900 dark:bg-white transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
