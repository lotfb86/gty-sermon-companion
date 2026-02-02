'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableSummaryProps {
  mainTheme?: string;
  brief?: string;
  detailed?: string;
  sermonType?: string;
  fallbackDescription?: string;
}

export default function ExpandableSummary({ mainTheme, brief, detailed, sermonType, fallbackDescription }: ExpandableSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  const summaryText = brief || fallbackDescription;
  const hasDetailed = detailed && detailed !== brief;

  if (!summaryText && !mainTheme) return null;

  return (
    <div className="card-elevated">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
          Summary
        </h3>
        {sermonType && (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20">
            {sermonType}
          </span>
        )}
      </div>

      {mainTheme && (
        <p className="text-sm italic text-[var(--accent)] leading-relaxed mb-3">
          {mainTheme}
        </p>
      )}

      <p className="text-[var(--text-secondary)] leading-relaxed text-sm">
        {expanded && hasDetailed ? detailed : summaryText}
      </p>

      {hasDetailed && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 mt-3 text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
        >
          {expanded ? (
            <>
              Show less <ChevronUp size={14} />
            </>
          ) : (
            <>
              Read full summary <ChevronDown size={14} />
            </>
          )}
        </button>
      )}
    </div>
  );
}
