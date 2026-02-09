import Link from 'next/link';
import { search, searchTranscripts, getCachedMetadataValues, parseScriptureQuery, type SearchFilterOptions } from '@/lib/db';
import { Search as SearchIcon } from 'lucide-react';
import SeriesResultCard from '@/components/search/SeriesResultCard';
import SermonResultCard from '@/components/search/SermonResultCard';
import TranscriptResultCard from '@/components/search/TranscriptResultCard';
import FilterBar from '@/components/FilterBar';
import SearchModeSelector from '@/components/SearchModeSelector';
import { Suspense } from 'react';
import { getDimension } from '@/lib/metadata';
import { extractSnippets } from '@/lib/snippets';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'date-desc', label: 'Newest' },
  { value: 'date-asc', label: 'Oldest' },
];

const FILTERS = [
  { key: 'transcript', label: 'Has Transcript', type: 'toggle' as const },
  { key: 'outline', label: 'Has Outline', type: 'toggle' as const },
  {
    key: 'content',
    label: 'Content Type',
    type: 'select' as const,
    options: [
      { value: 'sermons', label: 'Sermons Only' },
      { value: 'series', label: 'Series Only' },
    ],
  },
  {
    key: 'type',
    label: 'Sermon Type',
    type: 'select' as const,
    options: [
      { value: 'Expository', label: 'Expository' },
      { value: 'Topical', label: 'Topical' },
      { value: 'Doctrinal', label: 'Doctrinal' },
      { value: 'Evangelistic', label: 'Evangelistic' },
      { value: 'Biographical', label: 'Biographical' },
    ],
  },
  {
    key: 'category',
    label: 'Theology',
    type: 'select' as const,
    options: [
      { value: 'Soteriology', label: 'Soteriology' },
      { value: 'Christology', label: 'Christology' },
      { value: 'Pneumatology', label: 'Pneumatology' },
      { value: 'Eschatology', label: 'Eschatology' },
      { value: 'Ecclesiology', label: 'Ecclesiology' },
      { value: 'Bibliology', label: 'Bibliology' },
      { value: 'Theology Proper', label: 'Theology Proper' },
      { value: 'Hamartiology', label: 'Hamartiology' },
    ],
  },
  {
    key: 'decade',
    label: 'Decade',
    type: 'select' as const,
    options: [
      { value: '1960', label: '1960s' },
      { value: '1970', label: '1970s' },
      { value: '1980', label: '1980s' },
      { value: '1990', label: '1990s' },
      { value: '2000', label: '2000s' },
      { value: '2010', label: '2010s' },
      { value: '2020', label: '2020s' },
    ],
  },
];

/** Map search modes to metadata dimension slugs */
const MODE_TO_DIMENSION: Record<string, string> = {
  keyword: 'keywords',
  theme: 'themes',
  doctrine: 'doctrines',
  character: 'characters',
  author: 'authors',
  place: 'places',
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = (params.q as string) || '';
  const mode = (params.mode as string) || 'all';
  const sort = (params.sort as string) || 'relevance';
  const hasTranscript = params.transcript === '1';
  const hasOutline = params.outline === '1';
  const content = params.content as string | undefined;
  const sermonType = params.type as string | undefined;
  const category = params.category as string | undefined;
  const decade = params.decade as string | undefined;
  const sermonOffset = parseInt((params.offset as string) || '0', 10);

  const filters: SearchFilterOptions = {
    sort: sort as SearchFilterOptions['sort'],
    hasTranscript: hasTranscript || undefined,
    hasOutline: hasOutline || undefined,
    sermonType,
    content: content as SearchFilterOptions['content'],
    category,
    decade,
  };

  // Check if we're in a metadata mode
  const dimensionSlug = MODE_TO_DIMENSION[mode];
  const dim = dimensionSlug ? getDimension(dimensionSlug) : null;

  // For metadata modes: get matching tags and/or popular tags
  let metadataTags: { value: string; sermon_count: number }[] = [];
  let browseAllHref: string | null = null;

  if (dim) {
    browseAllHref = `/browse/metadata/${dim.slug}`;
    // Use pre-computed cache for instant results
    metadataTags = await getCachedMetadataValues(dim.slug, {
      limit: 20,
      search: query || undefined,
    });
  }

  // Run transcript search if in transcript mode
  const isTranscriptMode = mode === 'transcript';
  const transcriptResults = (isTranscriptMode && query)
    ? await searchTranscripts(query, 31, sermonOffset)
    : null;
  const scriptureRef = parseScriptureQuery(query);
  const snippetQuery = scriptureRef
    ? `${scriptureRef.book}${scriptureRef.chapter ? ` ${scriptureRef.chapter}` : ''}${scriptureRef.verse !== undefined ? `:${scriptureRef.verse}${scriptureRef.verseEnd !== undefined ? `-${scriptureRef.verseEnd}` : ''}` : ''}`
    : query;

  // Process transcript results: extract snippets, strip full text
  const transcriptWithSnippets = transcriptResults
    ? transcriptResults.slice(0, 30).map(row => ({
        id: row.id,
        sermon_code: row.sermon_code,
        title: row.title,
        audio_url: row.audio_url,
        date_preached: row.date_preached,
        verse: row.verse,
        series_name: row.series_name,
        snippets: extractSnippets(row.transcript_text || '', snippetQuery, 2, 140),
      }))
    : null;
  const hasMoreTranscripts = transcriptResults ? transcriptResults.length > 30 : false;

  // Run main search when there's a query (for non-transcript modes)
  const results = (query && !isTranscriptMode) ? await search(query, filters, sermonOffset) : null;

  // Build pagination URL helper
  const buildPaginationUrl = (newOffset: number) => {
    const p = new URLSearchParams();
    p.set('q', query);
    if (mode !== 'all') p.set('mode', mode);
    if (sort !== 'relevance') p.set('sort', sort);
    if (hasTranscript) p.set('transcript', '1');
    if (hasOutline) p.set('outline', '1');
    if (content) p.set('content', content);
    if (sermonType) p.set('type', sermonType);
    if (category) p.set('category', category);
    if (decade) p.set('decade', decade);
    if (newOffset > 0) p.set('offset', newOffset.toString());
    return `/search?${p.toString()}`;
  };

  return (
    <div className="pb-32 animate-fade-in">
      {/* Header */}
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-30 border-b border-white/5">
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">Search</h1>
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
          Find Sermons
        </p>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Search Bar */}
        <div>
          <form action="/search" method="GET" className="search-bar">
            <div className="relative">
              <SearchIcon
                className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
                size={18}
              />
              <input
                type="search"
                name="q"
                placeholder={dim ? `Search ${dim.labelPlural.toLowerCase()}...` : 'Search by title, topic, or scripture...'}
                className="search-input"
                defaultValue={query}
                autoFocus
              />
              {mode !== 'all' && <input type="hidden" name="mode" value={mode} />}
            </div>
          </form>
        </div>

        {/* Search Mode Selector */}
        <Suspense fallback={null}>
          <SearchModeSelector />
        </Suspense>

        {/* Metadata Tags (shown for metadata modes) */}
        {dim && metadataTags.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                {query ? `Matching ${dim.labelPlural}` : `Popular ${dim.labelPlural}`}
              </h3>
              {browseAllHref && (
                <Link
                  href={browseAllHref}
                  className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                >
                  Show All →
                </Link>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {metadataTags.map((tag) => (
                <Link
                  key={tag.value}
                  href={`/browse/metadata/${dim.slug}/${encodeURIComponent(tag.value)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                    bg-[var(--surface)] border border-[var(--border-subtle)]
                    text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40
                    transition-all"
                >
                  <span>{tag.value}</span>
                  <span className="text-[var(--text-quaternary)]">{tag.sermon_count}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Transcript Results */}
        {transcriptWithSnippets ? (
          <>
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                Transcript Matches ({transcriptWithSnippets.length}{hasMoreTranscripts ? '+' : ''})
              </h3>
              <div className="space-y-3">
                {transcriptWithSnippets.map((result) => (
                  <TranscriptResultCard key={result.id} result={result} query={query} />
                ))}
              </div>
            </section>

            {/* Transcript Pagination */}
            {(sermonOffset > 0 || hasMoreTranscripts) && (
              <div className="flex gap-3 justify-center">
                {sermonOffset > 0 && (
                  <Link
                    href={buildPaginationUrl(Math.max(0, sermonOffset - 30))}
                    className="btn btn-secondary text-sm"
                  >
                    ← Previous
                  </Link>
                )}
                {hasMoreTranscripts && (
                  <Link
                    href={buildPaginationUrl(sermonOffset + 30)}
                    className="btn btn-primary text-sm"
                  >
                    More Results →
                  </Link>
                )}
              </div>
            )}

            {transcriptWithSnippets.length === 0 && (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">📜</div>
                <h3 className="font-serif text-base font-semibold mb-2 text-[var(--text-primary)]">
                  No transcript matches
                </h3>
                <p className="text-[var(--text-secondary)] mb-4">
                  Try a different search term or switch to &quot;All&quot; mode
                </p>
              </div>
            )}
          </>
        ) : results ? (
          <>
            {/* Filter Bar */}
            <Suspense fallback={null}>
              <FilterBar
                sortOptions={SORT_OPTIONS}
                defaultSort="relevance"
                filters={FILTERS}
                resultCount={results.total_results}
                preserveKeys={['q', 'mode']}
              />
            </Suspense>

            {/* Series Results */}
            {results.series.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                    Series ({results.series.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {results.series.map((series) => (
                    <SeriesResultCard key={series.id} series={series} query={query} />
                  ))}
                </div>
              </section>
            )}

            {/* Sermons Results */}
            {results.sermons.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                    Sermons ({results.sermons.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {results.sermons.map((sermon) => (
                    <SermonResultCard key={sermon.id} sermon={sermon} query={query} />
                  ))}
                </div>
              </section>
            )}

            {/* Sermon Pagination */}
            {(sermonOffset > 0 || results.hasMoreSermons) && (
              <div className="space-y-3">
                {sermonOffset > 0 && (
                  <div className="text-center text-[11px] text-[var(--text-tertiary)]">
                    Showing sermons {sermonOffset + 1}–{sermonOffset + results.sermons.length}
                  </div>
                )}
                <div className="flex gap-3 justify-center">
                  {sermonOffset > 0 && (
                    <Link
                      href={buildPaginationUrl(Math.max(0, sermonOffset - 50))}
                      className="btn btn-secondary text-sm"
                    >
                      ← Previous
                    </Link>
                  )}
                  {results.hasMoreSermons && (
                    <Link
                      href={buildPaginationUrl(sermonOffset + 50)}
                      className="btn btn-primary text-sm"
                    >
                      More Sermons →
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* No Results */}
            {results.total_results === 0 && !dim && (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">🔍</div>
                <h3 className="font-serif text-base font-semibold mb-2 text-[var(--text-primary)]">
                  No results found
                </h3>
                <p className="text-[var(--text-secondary)] mb-6">
                  Try searching for a different scripture, topic, or keyword
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Link href="/search?q=grace" className="tag">
                    Grace
                  </Link>
                  <Link href="/search?q=faith" className="tag">
                    Faith
                  </Link>
                  <Link href="/search?q=Romans+8" className="tag">
                    Romans 8
                  </Link>
                </div>
              </div>
            )}
          </>
        ) : !dim ? (
          /* No query and no metadata mode - show default empty state */
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="font-serif text-base font-semibold mb-2 text-[var(--text-primary)]">
              Search for sermons
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Find sermon series and individual messages by scripture, topic, or keyword
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link href="/search?q=grace" className="tag">
                Grace
              </Link>
              <Link href="/search?q=faith" className="tag">
                Faith
              </Link>
              <Link href="/search?q=Romans+8" className="tag">
                Romans 8
              </Link>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
