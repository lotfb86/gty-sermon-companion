'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

interface ScriptureRefWithContext {
  reference: string;
  context?: string;
  frequency?: number;
}

interface PrimaryPassage {
  book?: string;
  chapter?: number;
  verses?: string;
  reference?: string;
}

interface ScriptureRefsWithContextProps {
  primaryPassage?: PrimaryPassage;
  allReferences?: ScriptureRefWithContext[];
}

function parseBookAndChapter(reference: string): { book: string; chapter: string } | null {
  // Match patterns like "Romans 8:1-4", "1 Peter 3:15", "Genesis 1"
  const match = reference.match(/^(\d?\s?[A-Za-z]+)\s+(\d+)/);
  if (match) {
    return { book: match[1].trim(), chapter: match[2] };
  }
  return null;
}

export default function ScriptureRefsWithContext({ primaryPassage, allReferences }: ScriptureRefsWithContextProps) {
  const [showAll, setShowAll] = useState(false);

  if (!allReferences || allReferences.length === 0) return null;

  const INITIAL_SHOW = 6;
  const visibleRefs = showAll ? allReferences : allReferences.slice(0, INITIAL_SHOW);
  const hasMore = allReferences.length > INITIAL_SHOW;

  return (
    <div className="card-elevated">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen size={18} className="text-[var(--accent)]" />
        <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
          Scripture References
        </h3>
        <span className="text-[10px] text-[var(--text-tertiary)] ml-auto">
          {allReferences.length} passage{allReferences.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Primary Passage */}
      {primaryPassage?.reference && (
        <div className="mb-4 p-3 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/20">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)] block mb-1">
            Primary Passage
          </span>
          {(() => {
            const parsed = parseBookAndChapter(primaryPassage.reference);
            if (parsed) {
              return (
                <Link
                  href={`/browse/scripture/${encodeURIComponent(parsed.book)}/${parsed.chapter}`}
                  className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
                >
                  {primaryPassage.reference}
                </Link>
              );
            }
            return (
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {primaryPassage.reference}
              </span>
            );
          })()}
        </div>
      )}

      {/* All References */}
      <div className="space-y-2">
        {visibleRefs.map((ref, idx) => {
          const parsed = parseBookAndChapter(ref.reference);
          const isPrimary = primaryPassage?.reference === ref.reference;

          return (
            <div
              key={idx}
              className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${
                isPrimary ? 'bg-[var(--accent-subtle)]/50' : 'hover:bg-[var(--surface-hover)]'
              }`}
            >
              <div className="flex-1 min-w-0">
                {parsed ? (
                  <Link
                    href={`/browse/scripture/${encodeURIComponent(parsed.book)}/${parsed.chapter}`}
                    className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
                  >
                    {ref.reference}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {ref.reference}
                  </span>
                )}
                {ref.context && (
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed">
                    {ref.context}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1.5 mt-3 text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
        >
          {showAll ? (
            <>Show fewer <ChevronUp size={14} /></>
          ) : (
            <>Show all {allReferences.length} references <ChevronDown size={14} /></>
          )}
        </button>
      )}
    </div>
  );
}
