'use client';

import { useEffect, useRef } from 'react';
import HighlightText from '@/components/search/HighlightText';

interface TranscriptWithHighlightProps {
  text: string;
  query: string;
}

export default function TranscriptWithHighlight({ text, query }: TranscriptWithHighlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query || !containerRef.current) return;

    // Small delay to let the DOM render with <mark> elements
    const timer = setTimeout(() => {
      const firstMark = containerRef.current?.querySelector('mark');
      if (firstMark) {
        firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div ref={containerRef} className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
      <HighlightText text={text} query={query} />
    </div>
  );
}
