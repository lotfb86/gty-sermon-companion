import Link from 'next/link';
import { getSermonsByTopic, countSermonsByTopic, getAllTopics, type SermonFilterOptions } from '@/lib/db';
import BookCover from '@/components/BookCover';
import FilterBar from '@/components/FilterBar';
import PlayButton from '@/components/PlayButton';
import { Suspense } from 'react';

const SERMONS_PER_PAGE = 50;

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Newest' },
  { value: 'date-asc', label: 'Oldest' },
  { value: 'title-az', label: 'Title A-Z' },
];

const FILTERS = [
  { key: 'transcript', label: 'Has Transcript', type: 'toggle' as const },
  {
    key: 'type',
    label: 'Sermon Type',
    type: 'select' as const,
    options: [
      { value: 'Expository', label: 'Expository' },
      { value: 'Topical', label: 'Topical' },
      { value: 'Q&A', label: 'Q&A' },
      { value: 'Biographical', label: 'Biographical' },
    ],
  },
];

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TopicDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const topicId = parseInt(id, 10);
  const allTopics = await getAllTopics();
  const topic = allTopics.find(t => t.id === topicId);

  if (!topic) {
    return (
      <div className="pb-24 min-h-screen flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="font-serif text-2xl font-semibold mb-2 text-[var(--text-primary)]">Topic not found</h2>
          <Link href="/browse/topics" className="btn btn-primary mt-4">
            Browse topics
          </Link>
        </div>
      </div>
    );
  }

  const sort = (sp.sort as string) || 'date-desc';
  const offset = parseInt((sp.offset as string) || '0', 10);
  const hasTranscript = sp.transcript === '1';
  const sermonType = sp.type as string | undefined;

  const filters: SermonFilterOptions = {
    sort: sort as SermonFilterOptions['sort'],
    hasTranscript: hasTranscript || undefined,
    sermonType,
  };

  const sermons = await getSermonsByTopic(topicId, SERMONS_PER_PAGE + 1, offset, filters);
  const hasMore = sermons.length > SERMONS_PER_PAGE;
  const displaySermons = hasMore ? sermons.slice(0, SERMONS_PER_PAGE) : sermons;
  const totalCount = await countSermonsByTopic(topicId, filters);

  // Build pagination URLs
  const buildUrl = (newOffset: number) => {
    const p = new URLSearchParams();
    if (sort !== 'date-desc') p.set('sort', sort);
    if (hasTranscript) p.set('transcript', '1');
    if (sermonType) p.set('type', sermonType);
    if (newOffset > 0) p.set('offset', newOffset.toString());
    const qs = p.toString();
    return `/topics/${id}${qs ? '?' + qs : ''}`;
  };

  return (
    <div className="pb-32 animate-fade-in">
      {/* Header */}
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-40 border-b border-white/5">
        <Link href="/browse/topics" className="text-[var(--accent)] text-xs hover:text-[var(--accent-hover)] transition-colors mb-2 inline-block">
          ← Back to Topics
        </Link>
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">
          {topic.name}
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

              const summary = typeof metadata?.summary === 'string'
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
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="font-serif text-base font-bold text-[var(--text-primary)] mb-2">
              No Sermons Found
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
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
