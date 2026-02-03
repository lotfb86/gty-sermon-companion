'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

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
  const [isPending, startTransition] = useTransition();
  const currentMode = searchParams.get('mode') || 'all';
  const query = searchParams.get('q') || '';

  const handleModeChange = (mode: string) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (mode !== 'all') params.set('mode', mode);
    const qs = params.toString();
    startTransition(() => {
      router.push(`/search${qs ? '?' + qs : ''}`);
    });
  };

  return (
    <div className={`flex gap-2 overflow-x-auto no-scrollbar pb-1 ${isPending ? 'opacity-60 pointer-events-none' : ''}`}>
      {SEARCH_MODES.map((mode) => (
        <button
          key={mode.value}
          onClick={() => handleModeChange(mode.value)}
          disabled={isPending}
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
  );
}
