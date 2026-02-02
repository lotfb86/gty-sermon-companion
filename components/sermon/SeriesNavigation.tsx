import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Sermon, Series } from '@/lib/db';

interface SeriesNavigationProps {
  series: Series;
  seriesPosition?: string | null;
  prev?: Sermon;
  next?: Sermon;
}

export default function SeriesNavigation({ series, seriesPosition, prev, next }: SeriesNavigationProps) {
  return (
    <div className="card-elevated">
      <h3 className="font-serif text-lg font-bold mb-3 text-[var(--text-primary)]">
        Part of Series
      </h3>

      <Link
        href={`/series/${series.id}`}
        className="flex items-center justify-between group mb-3"
      >
        <div>
          <div className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
            {series.name}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {series.book && (
              <span className="text-xs text-[var(--text-tertiary)]">
                Teaching through {series.book}
              </span>
            )}
            {seriesPosition && (
              <span className="text-[10px] font-medium text-[var(--accent)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded-full">
                {seriesPosition}
              </span>
            )}
          </div>
        </div>
        <div className="text-[var(--accent)] group-hover:translate-x-1 transition-transform">
          &rarr;
        </div>
      </Link>

      {/* Prev/Next Navigation */}
      {(prev || next) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
          {prev ? (
            <Link
              href={`/sermons/${prev.sermon_code}`}
              className="flex-1 flex items-center gap-2 p-2.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors group"
            >
              <ChevronLeft size={16} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent)] flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Previous</div>
                <div className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] line-clamp-1 transition-colors">
                  {prev.title}
                </div>
              </div>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {next ? (
            <Link
              href={`/sermons/${next.sermon_code}`}
              className="flex-1 flex items-center gap-2 p-2.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors group text-right"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Next</div>
                <div className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] line-clamp-1 transition-colors">
                  {next.title}
                </div>
              </div>
              <ChevronRight size={16} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent)] flex-shrink-0" />
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      )}
    </div>
  );
}
