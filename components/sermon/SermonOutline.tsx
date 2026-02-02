'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ListOrdered } from 'lucide-react';

interface MainPoint {
  number: number;
  title: string;
  description?: string;
  verses?: string[];
}

interface SermonOutlineProps {
  mainPoints: MainPoint[];
  outlineStyle?: string;
  progression?: string;
}

export default function SermonOutline({ mainPoints, outlineStyle, progression }: SermonOutlineProps) {
  const [expandedPoints, setExpandedPoints] = useState<Set<number>>(new Set());

  if (!mainPoints || mainPoints.length === 0) return null;

  const togglePoint = (num: number) => {
    setExpandedPoints((prev) => {
      const next = new Set(prev);
      if (next.has(num)) {
        next.delete(num);
      } else {
        next.add(num);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (expandedPoints.size === mainPoints.length) {
      setExpandedPoints(new Set());
    } else {
      setExpandedPoints(new Set(mainPoints.map((p) => p.number)));
    }
  };

  return (
    <div className="card-elevated">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ListOrdered size={18} className="text-[var(--accent)]" />
          <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
            Sermon Outline
          </h3>
        </div>
        <button
          onClick={expandAll}
          className="text-[10px] font-medium text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors uppercase tracking-wider"
        >
          {expandedPoints.size === mainPoints.length ? 'Collapse' : 'Expand All'}
        </button>
      </div>

      {outlineStyle && (
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
          {outlineStyle} outline
        </p>
      )}

      <div className="space-y-2">
        {mainPoints.map((point) => {
          const isExpanded = expandedPoints.has(point.number);
          return (
            <div
              key={point.number}
              className="border border-white/5 rounded-xl overflow-hidden transition-colors hover:border-[var(--accent)]/20"
            >
              <button
                onClick={() => togglePoint(point.number)}
                className="w-full flex items-start gap-3 p-3 text-left"
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center text-xs font-bold">
                  {point.number}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
                    {point.title}
                  </span>
                  {point.verses && point.verses.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {point.verses.map((v, i) => (
                        <span key={i} className="text-[10px] text-[var(--accent)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded-full">
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="flex-shrink-0 text-[var(--text-tertiary)] mt-0.5">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </button>

              {isExpanded && point.description && (
                <div className="px-3 pb-3 pl-13">
                  <div className="ml-10 text-sm text-[var(--text-secondary)] leading-relaxed border-l-2 border-[var(--accent)]/20 pl-3">
                    {point.description}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {progression && (
        <p className="text-xs text-[var(--text-tertiary)] mt-4 italic leading-relaxed">
          {progression}
        </p>
      )}
    </div>
  );
}
