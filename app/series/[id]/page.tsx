import Link from 'next/link';
import { getSeriesById, getSermonsBySeries, getSeriesScriptureRange, type SeriesDetailFilterOptions } from '@/lib/db';
import BookCover from '@/components/BookCover';
import FilterBar from '@/components/FilterBar';
import PlayButton from '@/components/PlayButton';
import AddToQueueButton from '@/components/AddToQueueButton';
import { Suspense } from 'react';

const SORT_OPTIONS = [
  { value: 'series-order', label: 'Series Order' },
  { value: 'verse', label: 'By Scripture' },
  { value: 'newest', label: 'Newest First' },
];

const FILTERS = [
  { key: 'transcript', label: 'Has Transcript', type: 'toggle' as const },
];

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SeriesDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const seriesId = parseInt(id, 10);
  const series = await getSeriesById(seriesId);

  if (!series) {
    return (
      <div className="pb-24 min-h-screen flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="font-serif text-2xl font-semibold mb-2 text-[var(--text-primary)]">Series not found</h2>
          <Link href="/browse/study-by-book" className="btn btn-primary mt-4">
            Browse books
          </Link>
        </div>
      </div>
    );
  }

  const sort = (sp.sort as string) || 'series-order';
  const hasTranscript = sp.transcript === '1';
  const fromBook = sp.from as string | undefined;

  const filters: SeriesDetailFilterOptions = {
    sort: sort as SeriesDetailFilterOptions['sort'],
    hasTranscript: hasTranscript || undefined,
  };

  const sermons = await getSermonsBySeries(seriesId, filters);
  const scriptureRange = await getSeriesScriptureRange(seriesId);

  // For numbering: always use chronological order index
  const allSermons = (sort !== 'series-order' || hasTranscript) ? await getSermonsBySeries(seriesId) : sermons;
  const sermonIndexMap = new Map(allSermons.map((s, i) => [s.id, i + 1]));

  const lastSermon = allSermons[allSermons.length - 1];
  const startYear = allSermons[0]?.date_preached ? new Date(allSermons[0].date_preached).getFullYear() : null;
  const endYear = lastSermon?.date_preached
    ? new Date(lastSermon.date_preached).getFullYear()
    : null;

  return (
    <div className="pb-40 animate-fade-in">
      {/* Header */}
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-30 border-b border-white/5">
        <Link
          href={fromBook
            ? `/browse/study-by-book/${encodeURIComponent(fromBook)}`
            : series.book
              ? `/browse/study-by-book/${encodeURIComponent(series.book)}`
              : '/browse/study-by-book'
          }
          className="text-[var(--accent)] text-xs hover:text-[var(--accent-hover)] transition-colors mb-2 inline-block"
        >
          {fromBook
            ? `← Back to Study ${fromBook}`
            : series.book
              ? `← Back to Study ${series.book}`
              : '← Back to Study by Book'
          }
        </Link>
        <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-[0.2em] font-semibold mb-1">
          Sermon Series
        </p>
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">
          {series.name}
        </h1>
      </header>

      <main className="px-4 py-4 space-y-5">
          {/* Series Header */}
          <div className="card-elevated">
            <div className="flex gap-4 mb-4">
              <div className="flex-shrink-0">
                <BookCover
                  title={series.name || 'Untitled Series'}
                  subtitle={series.book || 'Bible Study'}
                  size="lg"
                />
              </div>

              <div className="flex-1">
                <h2 className="font-serif text-2xl font-semibold text-[var(--text-primary)] mb-1">
                  {series.name}
                </h2>
                {scriptureRange && (
                  <p className="text-sm text-[var(--accent)] font-medium mb-3">
                    {scriptureRange}
                  </p>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-[var(--text-tertiary)] mb-4">
                  {series.book && !scriptureRange && (
                    <div className="flex items-center gap-1">
                      <span>📖</span>
                      <span>{series.book}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span>🎧</span>
                    <span>{allSermons.length} sermons</span>
                  </div>
                  {startYear && (
                    <div className="flex items-center gap-1">
                      <span>📅</span>
                      <span>
                        {startYear}{endYear && endYear !== startYear ? `-${endYear}` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {series.description && (
                  <p className="text-[var(--text-secondary)] mb-4">
                    {series.description}
                  </p>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-[var(--text-secondary)]">Series Progress</span>
                <span className="font-semibold text-[var(--text-tertiary)]">0%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '0%' }}></div>
              </div>
              <div className="text-xs text-[var(--text-tertiary)] mt-2">
                Sign in to track your progress
              </div>
            </div>

            {/* Add Series to Queue */}
            <div className="mt-4">
              <AddToQueueButton
                seriesId={seriesId}
                seriesName={series.name}
                variant="button"
                className="w-full justify-center"
              />
            </div>
          </div>

          {/* Filter Bar */}
          <Suspense fallback={null}>
            <FilterBar
              sortOptions={SORT_OPTIONS}
              defaultSort="series-order"
              filters={FILTERS}
              resultCount={sermons.length}
            />
          </Suspense>

          {/* Sermon List */}
          <div>
            <h3 className="font-serif text-lg font-semibold mb-4 text-[var(--text-primary)]">
              Sermons in this series
            </h3>

            {sermons.length > 0 ? (
              <div className="space-y-3">
                {sermons.map((sermon) => {
                  let metadata: any = null;
                  try {
                    metadata = sermon.llm_metadata ? JSON.parse(sermon.llm_metadata) : null;
                  } catch {
                    // ignore
                  }

                  const summary = typeof metadata?.summary === 'string'
                    ? metadata.summary
                    : metadata?.summary?.brief;

                  const sermonNumber = sermonIndexMap.get(sermon.id) || 0;

                  return (
                    <div key={sermon.id} className="card group">
                      <div className="flex gap-3">
                        {/* Sermon Number */}
                        <div className="flex-shrink-0 w-12 h-12 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg flex items-center justify-center font-bold text-lg text-[var(--text-primary)]">
                          {sermonNumber}
                        </div>

                        {/* Sermon Info */}
                        <Link
                          href={`/sermons/${sermon.sermon_code}`}
                          className="flex-1 min-w-0"
                        >
                          <h4 className="font-serif font-semibold text-base text-[var(--text-primary)] mb-1 line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
                            {sermon.title}
                          </h4>

                          {sermon.verse && (
                            <p className="text-[11px] text-[var(--accent)] font-medium mb-1">
                              {sermon.verse}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 text-xs text-[var(--text-tertiary)] mb-2">
                            <span>
                              {sermon.date_preached
                                ? new Date(sermon.date_preached).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : <span className="italic text-[var(--text-quaternary)]">Date unknown</span>
                              }
                            </span>
                            {sermon.transcript_text && (
                              <span className="text-[var(--accent)]">• Transcript</span>
                            )}
                          </div>

                          {summary && (
                            <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                              {summary}
                            </p>
                          )}
                        </Link>

                        {/* Play & Queue Buttons */}
                        <div className="flex-shrink-0 flex items-center gap-1">
                          <AddToQueueButton sermon={sermon} variant="icon" />
                          <PlayButton sermon={sermon} size="sm" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🔍</div>
                <h3 className="font-serif text-base font-bold text-[var(--text-primary)] mb-2">
                  No Sermons Found
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mb-4">
                  Try adjusting your filters to see more results.
                </p>
              </div>
            )}
          </div>
      </main>
    </div>
  );
}
