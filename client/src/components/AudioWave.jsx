import React, { useMemo } from 'react';

const BAR_COUNT = 20;

function generateHeights() {
  return Array.from({ length: BAR_COUNT }, () => Math.floor(Math.random() * 24) + 16);
}

export default function AudioWave({ isActive }) {
  const heights = useMemo(() => generateHeights(), []);

  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full transition-all duration-300 ${
            isActive
              ? 'bg-zinc-900 dark:bg-white'
              : 'bg-zinc-300 dark:bg-zinc-700'
          }`}
          style={{
            height: isActive ? `${heights[i]}px` : '6px',
            animation: isActive
              ? `waveBar ${0.5 + (i % 5) * 0.15}s ease-in-out ${(i * 0.05) % 0.5}s infinite alternate`
              : 'none',
          }}
        />
      ))}
      <style>{`
        @keyframes waveBar {
          0%   { transform: scaleY(0.3); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
