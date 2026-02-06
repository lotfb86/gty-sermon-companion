import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getDimension } from '@/lib/metadata';
import { getSermonsByMetadata, countSermonsByMetadata } from '@/lib/db';
import FilterBar from '@/components/FilterBar';
import PlayButton from '@/components/PlayButton';

const SERMONS_PER_PAGE = 20;

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Newest' },
  { value: 'date-asc', label: 'Oldest' },
  { value: 'title-az', label: 'Title A-Z' },
];

const FILTERS = [
  { key: 'transcript', label: 'Has Transcript', type: 'toggle' as const },
];

interface PageProps {
  params: Promise<{ dimension: string; value: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MetadataDetailPage({ params, searchParams }: PageProps) {
  const { dimension: slug, value: encodedValue } = await params;
  const sp = await searchParams;
  const dim = getDimension(slug);

  if (!dim) return notFound();

  const value = decodeURIComponent(encodedValue);
  const sort = ((sp.sort as string) || 'date-desc') as 'date-desc' | 'date-asc' | 'title-az';
  const offset = parseInt((sp.offset as string) || '0', 10);
  const hasTranscript = sp.transcript === '1';

  const totalCount = await countSermonsByMetadata(dim.jsonPath, value, {
    extractKey: dim.extractKey,
    scalar: dim.scalar,
    hasTranscript: hasTranscript || undefined,
  });

  const sermons = await getSermonsByMetadata(dim.jsonPath, value, {
    limit: SERMONS_PER_PAGE + 1,
    offset,
    sort,
    extractKey: dim.extractKey,
    scalar: dim.scalar,
    hasTranscript: hasTranscript || undefined,
  });

  const hasMore = sermons.length > SERMONS_PER_PAGE;
  const displaySermons = hasMore ? sermons.slice(0, SERMONS_PER_PAGE) : sermons;

  // Build pagination URLs
  const buildUrl = (newOffset: number) => {
    const p = new URLSearchParams();
    if (sort !== 'date-desc') p.set('sort', sort);
    if (hasTranscript) p.set('transcript', '1');
    if (newOffset > 0) p.set('offset', newOffset.toString());
    const qs = p.toString();
    return `/browse/metadata/${slug}/${encodeURIComponent(value)}${qs ? '?' + qs : ''}`;
  };

  return (
    <div className="pb-32 animate-fade-in">
      {/* Header */}
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-40 border-b border-white/5">
        <Link
          href={`/browse/metadata/${slug}`}
          className="text-[var(--accent)] text-xs hover:text-[var(--accent-hover)] transition-colors mb-2 inline-block"
        >
          ← Back to {dim.labelPlural}
        </Link>
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">
          {value}
        </h1>
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
          {totalCount} sermon{totalCount !== 1 ? 's' : ''}
        </p>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Filter Bar */}
        <Suspense fallback={null}>
          <FilterBar
            sortOptions={SORT_OPTIONS}
            defaultSort="date-desc"
            filters={FILTERS}
            resultCount={totalCount}
          />
        </Suspense>

        {/* Sermon List */}
        {displaySermons.length > 0 ? (
          <div className="space-y-3">
            {displaySermons.map((sermon) => {
              let metadata: any = null;
              try {
                metadata = sermon.llm_metadata ? JSON.parse(sermon.llm_metadata) : null;
              } catch {
                // ignore
              }

              const summary =
                typeof metadata?.summary === 'string'
                  ? metadata.summary
                  : metadata?.summary?.brief;

              return (
                <div key={sermon.id} className="card group">
                  <div className="flex items-center gap-4">
                    <PlayButton sermon={sermon} size="sm" />

                    <Link
                      href={`/sermons/${sermon.sermon_code}`}
                      className="flex-1 min-w-0"
                    >
                      <h3 className="font-serif font-medium text-[var(--text-primary)] line-clamp-2 mb-1 group-hover:text-[var(--accent)] transition-colors">
                        {sermon.title}
                      </h3>

                      {sermon.verse && (
                        <p className="text-[11px] text-[var(--accent)] font-medium mb-1">
                          {sermon.verse}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)] mb-2">
                        {sermon.date_preached && (
                          <span>
                            {new Date(sermon.date_preached).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
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
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="font-serif text-base font-bold text-[var(--text-primary)] mb-2">
              No Sermons Found
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Try adjusting your filters to see more results.
            </p>
          </div>
        )}

        {/* Pagination */}
        {offset > 0 && (
          <div className="text-center text-[11px] text-[var(--text-tertiary)]">
            Showing {offset + 1}–{offset + displaySermons.length} of {totalCount.toLocaleString()}
          </div>
        )}

        <div className="flex gap-3 justify-center mt-4">
          {offset > 0 && (
            <Link
              href={buildUrl(Math.max(0, offset - SERMONS_PER_PAGE))}
              className="btn btn-secondary text-sm"
            >
              ← Previous
            </Link>
          )}
          {hasMore && (
            <Link href={buildUrl(offset + SERMONS_PER_PAGE)} className="btn btn-primary text-sm">
              Load More →
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
