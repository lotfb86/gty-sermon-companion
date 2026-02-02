import Link from 'next/link';
import BookCover from '@/components/BookCover';
import { SeriesSearchResult } from '@/lib/db';
import HighlightText from './HighlightText';

interface SeriesResultCardProps {
  series: SeriesSearchResult;
  query: string;
}

export default function SeriesResultCard({ series, query }: SeriesResultCardProps) {
  return (
    <Link href={`/series/${series.id}`} className="card group hover:border-[var(--accent)]/30 transition-all">
      <div className="flex items-start gap-3">
        <BookCover
          title={series.name}
          subtitle="Series"
          size="sm"
        />

        <div className="flex-1 min-w-0">
          <h3 className="font-serif font-semibold text-base text-[var(--text-primary)] mb-1 line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
            <HighlightText text={series.name} query={query} />
          </h3>

          <div className="flex flex-wrap gap-2 text-xs mb-2">
            <span className="text-[var(--text-secondary)]">
              {series.sermon_count} sermon{series.sermon_count !== 1 ? 's' : ''}
            </span>
            <span className="text-[var(--accent)] font-medium">
              {series.matching_sermons} match{series.matching_sermons !== 1 ? 'es' : ''}
            </span>
            {series.match_count > 0 && (
              <span className="text-[var(--text-tertiary)]">
                {Math.round(series.match_count)} mention{Math.round(series.match_count) !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {series.description && (
            <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
              {series.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
