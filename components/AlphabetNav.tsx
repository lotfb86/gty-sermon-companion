'use client';

import { useState, useEffect, useCallback } from 'react';

interface AlphabetNavProps {
  letters: string[];
}

export default function AlphabetNav({ letters }: AlphabetNavProps) {
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  // Track which letter section is currently in view
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    for (const letter of letters) {
      const el = document.getElementById(`topic-letter-${letter}`);
      if (!el) continue;

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveLetter(letter);
            }
          }
        },
        { rootMargin: '-100px 0px -60% 0px', threshold: 0 }
      );

      observer.observe(el);
      observers.push(observer);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, [letters]);

  const scrollToLetter = useCallback((letter: string) => {
    const el = document.getElementById(`topic-letter-${letter}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div className="sticky top-[72px] z-30 bg-[var(--bg-primary)]/95 backdrop-blur-sm border-b border-white/5 px-2 py-2">
      <div className="flex justify-center gap-[2px] flex-wrap">
        {letters.map((letter) => (
          <button
            key={letter}
            onClick={() => scrollToLetter(letter)}
            className={`w-[30px] h-[30px] flex items-center justify-center rounded text-[11px] font-bold transition-all
              ${activeLetter === letter
                ? 'bg-[var(--accent)] text-[var(--bg-primary)] shadow-sm'
                : 'text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--surface)]'
              }`}
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  );
}
