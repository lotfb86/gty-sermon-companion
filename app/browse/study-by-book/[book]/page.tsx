import Link from 'next/link';
import { getSeriesByBook, getSeriesScriptureRanges, getChaptersForBook, type StudyByBookFilterOptions } from '@/lib/db';
import BookCover from '@/components/BookCover';
import FilterBar from '@/components/FilterBar';
import { Suspense } from 'react';

const SORT_OPTIONS = [
  { value: 'date', label: 'Chronological' },
  { value: 'sermons', label: 'Most Sermons' },
  { value: 'name-az', label: 'Name A-Z' },
];

interface PageProps {
  params: Promise<{ book: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BookStudyPage({ params, searchParams }: PageProps) {
  const { book } = await params;
  const sp = await searchParams;
  const bookName = decodeURIComponent(book);

  const sort = (sp.sort as string) || 'date';
  const filters: StudyByBookFilterOptions = {
    sort: sort as StudyByBookFilterOptions['sort'],
  };

  const series = await getSeriesByBook(bookName, filters);
  const scriptureRanges = await getSeriesScriptureRanges(series.map(s => s.id));
  const chapters = await getChaptersForBook(bookName);
  const totalSermons = series.reduce((sum, s) => sum + (s.sermon_count || 0), 0);

  return (
    <div className="pb-32 animate-fade-in">
      {/* Header */}
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-40 border-b border-white/5">
        <Link href="/browse/study-by-book" className="text-[var(--accent)] text-xs hover:text-[var(--accent-hover)] transition-colors mb-2 inline-block">
          ← Back to Study by Book
        </Link>
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">
          Study {bookName}
        </h1>
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
          {series.length} {series.length === 1 ? 'series' : 'series'} · {totalSermons} sermons
        </p>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Sort Bar */}
        {series.length > 1 && (
          <Suspense fallback={null}>
            <FilterBar
              sortOptions={SORT_OPTIONS}
              defaultSort="date"
              resultCount={series.length}
            />
          </Suspense>
        )}

        {/* Chapter Navigation Grid */}
        {chapters.length > 1 && (
          <div className="card-elevated">
            <h3 className="font-serif text-sm font-bold mb-3 text-[var(--text-primary)]">
              Study by Chapter
            </h3>
            <div className="grid grid-cols-8 gap-1.5">
              {chapters.map((ch) => {
                const crossRefs = ch.total_count - ch.sermon_count;
                return (
                  <Link
                    key={ch.chapter}
                    href={`/browse/scripture/${encodeURIComponent(bookName)}/${ch.chapter}`}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-[var(--surface)] border border-white/5 hover:border-[var(--accent)]/40 hover:bg-[var(--accent-subtle)] transition-all group"
                  >
                    <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      {ch.chapter}
                    </span>
                    <span className="text-[9px] font-semibold text-[var(--text-tertiary)]">
                      {ch.sermon_count}
                    </span>
                    {crossRefs > 0 && (
                      <span className="text-[8px] text-[var(--text-quaternary)] leading-tight">
                        +{crossRefs}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Series List */}
        {series.length > 0 ? (
          <div className="space-y-4">
            {series.map((s) => {
              const startYear = s.first_sermon_date ? new Date(s.first_sermon_date).getFullYear() : null;
              const endYear = s.last_sermon_date ? new Date(s.last_sermon_date).getFullYear() : null;

              return (
                <Link
                  key={s.id}
                  href={`/series/${s.id}?from=${encodeURIComponent(bookName)}`}
                  className="block"
                >
                  <div className="card-elevated hover:border-[var(--accent)]">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <BookCover
                          title={s.name || 'Untitled Series'}
                          subtitle={`${s.sermon_count} sermons`}
                          size="md"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-[0.2em] font-semibold mb-0.5">
                          Sermon Series
                        </p>
                        <h3 className="font-serif text-lg font-semibold text-[var(--text-primary)] mb-1 line-clamp-2">
                          {s.name || 'Untitled Series'}
                        </h3>
                        {scriptureRanges[s.id] && (
                          <p className="text-[11px] text-[var(--accent)] font-medium mb-2">
                            {scriptureRanges[s.id]}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-3 text-sm text-[var(--text-tertiary)] mb-3">
                          <div className="flex items-center gap-1">
                            <span>📖</span>
                            <span>{s.sermon_count || 0} sermons</span>
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

                        {s.description && (
                          <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">
                            {s.description}
                          </p>
                        )}

                        <div className="btn btn-primary">
                          View Series →
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="font-serif text-lg font-semibold mb-2 text-[var(--text-primary)]">No series found</h3>
            <p className="text-[var(--text-secondary)] mb-6">
              There are no complete sermon series for {bookName} yet.
            </p>
            <Link href="/browse/study-by-book" className="btn btn-secondary">
              Browse other books
            </Link>
          </div>
        )}

        {/* Additional Resources */}
        {series.length > 0 && (
          <div className="card-elevated mt-8">
            <h4 className="font-serif font-semibold mb-3 text-[var(--text-primary)]">Additional Resources</h4>
            <div className="space-y-2">
              <Link
                href={`/browse/scripture/${encodeURIComponent(bookName)}`}
                className="flex items-center gap-2 text-[var(--accent)] hover:underline"
              >
                <span>→</span>
                <span>Browse all {bookName} sermons by chapter</span>
              </Link>
              <Link
                href={`/search?q=${encodeURIComponent(bookName)}`}
                className="flex items-center gap-2 text-[var(--accent)] hover:underline"
              >
                <span>→</span>
                <span>Search sermons mentioning {bookName}</span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
