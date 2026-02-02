'use client';

import { ChevronUp, ChevronDown, X } from 'lucide-react';
import type { QueueItem as QueueItemType } from '@/context/AudioContext';

interface QueueItemProps {
  item: QueueItemType;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onSkipTo: () => void;
}

export default function QueueItem({
  item,
  index,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
  onSkipTo,
}: QueueItemProps) {
  return (
    <div className="flex items-center gap-2 py-2.5 px-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] group hover:border-[var(--accent)]/20 transition-colors">
      {/* Position Number */}
      <span className="text-xs font-mono text-[var(--text-quaternary)] w-5 text-center shrink-0">
        {index + 1}
      </span>

      {/* Sermon Info (tappable to skip to) */}
      <button
        onClick={onSkipTo}
        className="flex-1 min-w-0 text-left"
      >
        <h4 className="text-sm font-serif font-medium text-[var(--text-primary)] line-clamp-1 group-hover:text-[var(--accent)] transition-colors">
          {item.title}
        </h4>
        <div className="flex items-center gap-1.5 mt-0.5">
          {item.verse && (
            <span className="text-[11px] text-[var(--accent)] font-medium">
              {item.verse}
            </span>
          )}
          {item.sourceType === 'series' && item.seriesName && (
            <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">
              {item.seriesName}
            </span>
          )}
        </div>
      </button>

      {/* Reorder Buttons */}
      <div className="flex flex-col shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          disabled={isFirst}
          className={`p-0.5 transition-colors ${
            isFirst ? 'text-[var(--text-quaternary)] opacity-20' : 'text-[var(--text-tertiary)] hover:text-[var(--accent)]'
          }`}
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          disabled={isLast}
          className={`p-0.5 transition-colors ${
            isLast ? 'text-[var(--text-quaternary)] opacity-20' : 'text-[var(--text-tertiary)] hover:text-[var(--accent)]'
          }`}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Remove Button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="p-1 text-[var(--text-quaternary)] hover:text-red-400 transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}
