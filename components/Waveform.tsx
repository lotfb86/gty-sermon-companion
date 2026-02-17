'use client';

import { useRef, useEffect, useState } from 'react';

interface WaveformProps {
  progress?: number; // 0-100
  bars?: number;
  className?: string;
}

export default function Waveform({ progress = 0, bars = 40, className = '' }: WaveformProps) {
  const [mounted, setMounted] = useState(false);

  // Generate heights once on mount and memoize — prevents different waveform
  // shapes every time the component re-mounts during navigation.
  const heightsRef = useRef<number[]>([]);
  if (heightsRef.current.length !== bars) {
    heightsRef.current = Array.from({ length: bars }, () => Math.random() * 100);
  }
  const heights = heightsRef.current;

  // Mark as mounted to avoid hydration mismatch (heights are random)
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`h-12 ${className}`}>
        {/* Placeholder during SSR */}
      </div>
    );
  }

  // Compute the index of the last active bar once, then use simple comparisons
  // in the loop instead of per-bar math.
  const activeUpTo = Math.floor((progress / 100) * bars);

  return (
    <div className={`flex items-end gap-[2px] h-12 ${className}`}>
      {heights.map((height, index) => {
        const isActive = index <= activeUpTo;
        return (
          <div
            key={index}
            className={`flex-1 rounded-t-sm ${
              isActive
                ? 'bg-[var(--accent)]'
                : 'bg-white/20 opacity-50'
            }`}
            style={{
              height: `${Math.max(20, height)}%`,
              // Use background-color transition only (not transition-all) to
              // avoid triggering expensive layout/paint on every progress tick.
              transition: 'background-color 0.3s ease, opacity 0.3s ease',
            }}
          />
        );
      })}
    </div>
  );
}
