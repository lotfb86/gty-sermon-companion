'use client';

import Link from 'next/link';
import { BookOpen, Library } from 'lucide-react';

export default function EmptyQueueState() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center">
        <Library size={28} className="text-[var(--text-tertiary)]" />
      </div>
      <h3 className="font-serif text-lg font-bold text-[var(--text-primary)] mb-2">
        Build Your Listening Path
      </h3>
      <p className="text-xs text-[var(--text-secondary)] mb-6 max-w-[280px] mx-auto leading-relaxed">
        Add sermons or entire series to your queue to create a personalized listening experience.
      </p>
      <div className="flex gap-3 justify-center">
        <Link
          href="/browse/scripture"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] text-[var(--bg-primary)] hover:scale-[1.02] transition-all shadow-lg"
        >
          <BookOpen size={16} />
          Browse Scripture
        </Link>
        <Link
          href="/browse/study-by-book"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)] transition-all"
        >
          Browse Series
        </Link>
      </div>
    </div>
  );
}
