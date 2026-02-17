import Link from 'next/link';
import { getAllSermons, countSermons, type SermonFilterOptions } from '@/lib/db';
import PlayButton from '@/components/PlayButton';
import AddToQueueButton from '@/components/AddToQueueButton';
import SermonListInfinite from '@/components/SermonListInfinite';
import FilterBar from '@/components/FilterBar';
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
  {
    key: 'cat',
    label: 'Category',
    type: 'select' as const,
    options: [
      { value: 'Soteriology', label: 'Salvation' },
      { value: 'Christology', label: 'Christ' },
      { value: 'Ecclesiology', label: 'Church' },
      { value: 'Eschatology', label: 'End Times' },
      { value: 'Pneumatology', label: 'Holy Spirit' },
      { value: 'Theology Proper', label: 'God' },
      { value: 'Hermeneutics', label: 'Interpretation' },
      { value: 'Sanctification', label: 'Sanctification' },
    ],
  },
];

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AllSermonsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sort = (params.sort as string) || 'date-desc';
  const offset = parseInt((params.offset as string) || '0', 10);
  const hasTranscript = params.transcript === '1';
  const sermonType = params.type as string | undefined;
  const category = params.cat as string | undefined;

  const filters: SermonFilterOptions = {
    sort: sort as SermonFilterOptions['sort'],
    hasTranscript: hasTranscript || undefined,
    sermonType,
    category,
  };

  // Fetch one extra to know if there are more
  const sermons = await getAllSermons(SERMONS_PER_PAGE + 1, offset, filters);
  const hasMore = sermons.length > SERMONS_PER_PAGE;
  const displaySermons = hasMore ? sermons.slice(0, SERMONS_PER_PAGE) : sermons;
  const totalCount = await countSermons(filters);

  // Offset is no longer used for manual pagination (using infinite scroll)

  return (
    <div className="pb-40 animate-fade-in">
      {/* Header */}
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-30 border-b border-white/5">
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">All Sermons</h1>
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
          {totalCount.toLocaleString()} sermons
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

        {/* Sermon List with Infinite Scroll */}
        <div className="space-y-3">
          <SermonListInfinite
            hasMore={hasMore}
            nextOffset={offset + displaySermons.length}
            fetchUrl={`/api/sermons?sort=${sort}${hasTranscript ? '&transcript=1' : ''}${sermonType ? `&type=${sermonType}` : ''}${category ? `&cat=${category}` : ''}`}
          >
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
                <div key={sermon.id} className="card group relative">
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
                  <div className="absolute top-2 right-2">
                    <AddToQueueButton sermon={sermon} variant="icon" />
                  </div>
                </div>
              );
            })}
          </SermonListInfinite>
        </div>

        {displaySermons.length === 0 && (
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
      </main>
    </div>
  );
}
