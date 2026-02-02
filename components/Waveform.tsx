'use client';

import { useEffect, useState } from 'react';

interface WaveformProps {
  progress?: number; // 0-100
  bars?: number;
  className?: string;
}

export default function Waveform({ progress = 0, bars = 40, className = '' }: WaveformProps) {
  const [heights, setHeights] = useState<number[]>([]);

  // Generate heights on client side only to avoid hydration mismatch
  useEffect(() => {
    setHeights(Array.from({ length: bars }, () => Math.random() * 100));
  }, [bars]);

  // Don't render until client-side heights are generated
  if (heights.length === 0) {
    return (
      <div className={`h-12 ${className}`}>
        {/* Placeholder */}
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-[2px] h-12 ${className}`}>
      {heights.map((height, index) => {
        const isActive = (index / bars) * 100 <= progress;
        return (
          <div
            key={index}
            className={`flex-1 rounded-t-sm transition-all duration-300 ${
              isActive
                ? 'bg-[var(--accent)] opacity-100'
                : 'bg-white/20 opacity-50'
            }`}
            style={{
              height: `${Math.max(20, height)}%`,
            }}
          />
        );
      })}
    </div>
  );
}
