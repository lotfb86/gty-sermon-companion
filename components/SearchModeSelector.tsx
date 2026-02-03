'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState, useEffect, useCallback } from 'react';

const SEARCH_MODES = [
  { value: 'all', label: 'All' },
  { value: 'transcript', label: 'Transcript' },
  { value: 'scripture', label: 'Scripture' },
  { value: 'topic', label: 'Topic' },
  { value: 'keyword', label: 'Keyword' },
  { value: 'theme', label: 'Theme' },
  { value: 'doctrine', label: 'Doctrine' },
  { value: 'character', label: 'Character' },
  { value: 'author', label: 'Author' },
  { value: 'place', label: 'Place' },
];

export default function SearchModeSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentMode = searchParams.get('mode') || 'all';
  const query = searchParams.get('q') || '';

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => observer.disconnect();
  }, [checkScroll]);

  const handleModeChange = (mode: string) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (mode !== 'all') params.set('mode', mode);
    const qs = params.toString();
    router.push(`/search${qs ? '?' + qs : ''}`);
  };

  return (
    <div className="relative">
      {/* Left fade */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-6 z-10 pointer-events-none bg-gradient-to-r from-[var(--bg-primary)] to-transparent" />
      )}

      {/* Scrollable pills */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-2 overflow-x-auto no-scrollbar pb-1"
      >
        {SEARCH_MODES.map((mode) => (
          <button
            key={mode.value}
            onClick={() => handleModeChange(mode.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all
              ${currentMode === mode.value
                ? 'bg-[var(--accent)] text-[var(--bg-primary)] shadow-sm'
                : 'bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40'
              }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Right fade */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-6 z-10 pointer-events-none bg-gradient-to-l from-[var(--bg-primary)] to-transparent" />
      )}
    </div>
  );
}
