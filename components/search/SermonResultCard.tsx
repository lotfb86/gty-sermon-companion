import Link from 'next/link';
import PlayButton from '@/components/PlayButton';
import { SermonSearchResult } from '@/lib/db';
import HighlightText from './HighlightText';

interface SermonResultCardProps {
  sermon: SermonSearchResult;
  query: string;
}

export default function SermonResultCard({ sermon, query }: SermonResultCardProps) {
  const totalMentions = Math.round(
    sermon.title_matches + sermon.transcript_matches + sermon.description_matches
  );

  // Parse metadata for brief summary and sermon type
  let metadata: any = null;
  try {
    metadata = sermon.llm_metadata ? JSON.parse(sermon.llm_metadata) : null;
  } catch (e) {
    // ignore
  }

  const briefSummary = typeof metadata?.summary === 'string'
    ? metadata.summary
    : metadata?.summary?.brief;
  const sermonType = metadata?.summary?.sermon_type;

  return (
    <Link href={`/sermons/${sermon.sermon_code}`} className="card group">
      <div className="flex items-center gap-3">
        <PlayButton sermon={sermon} size="sm" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-serif font-semibold text-sm text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
              <HighlightText text={sermon.title} query={query} />
            </h3>
          </div>

          {sermon.verse && (
            <p className="text-[11px] text-[var(--accent)] font-medium mb-1">
              {sermon.verse}
            </p>
          )}

          {/* Brief summary preview */}
          {briefSummary && (
            <p className="text-[11px] text-[var(--text-tertiary)] line-clamp-1 mb-1 leading-relaxed">
              {briefSummary}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
            {sermonType && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent)]">
                {sermonType}
              </span>
            )}
            {sermon.series_name && (
              <span className="line-clamp-1">{sermon.series_name}</span>
            )}
            {(sermon.series_name || sermonType) && sermon.date_preached && (
              <span>·</span>
            )}
            {sermon.date_preached && (
              <span>
                {new Date(sermon.date_preached).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            )}
          </div>
        </div>

        {/* Relevance Indicator */}
        {totalMentions > 0 && (
          <div className="shrink-0 text-xs text-[var(--accent)] font-medium">
            {totalMentions}×
          </div>
        )}
      </div>
    </Link>
  );
}
