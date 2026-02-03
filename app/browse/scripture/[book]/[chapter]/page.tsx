import Link from 'next/link';
import { getSermonsByScripture, getReferencingSermons, type ScriptureFilterOptions } from '@/lib/db';
import FilterBar from '@/components/FilterBar';
import PlayButton from '@/components/PlayButton';
import AddToQueueButton from '@/components/AddToQueueButton';
import { Suspense } from 'react';

const SORT_OPTIONS = [
  { value: 'verse', label: 'By Verse' },
  { value: 'date-desc', label: 'Newest' },
  { value: 'date-asc', label: 'Oldest' },
];

const FILTERS = [
  { key: 'transcript', label: 'Has Transcript', type: 'toggle' as const },
];

interface PageProps {
  params: Promise<{ book: string; chapter: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ScriptureChapterPage({ params, searchParams }: PageProps) {
  const { book, chapter } = await params;
  const sp = await searchParams;
  const bookName = decodeURIComponent(book);
  const chapterNum = parseInt(chapter, 10);

  const sort = (sp.sort as string) || 'verse';
  const hasTranscript = sp.transcript === '1';
  const refOffset = parseInt((sp.refOffset as string) || '0', 10);

  const filters: ScriptureFilterOptions = {
    sort: sort as ScriptureFilterOptions['sort'],
    hasTranscript: hasTranscript || undefined,
  };

  // Primary sermons: where this book is the primary reference
  const sermons = await getSermonsByScripture(bookName, chapterNum, undefined, 100, filters);

  // Cross-referencing sermons: where this chapter is referenced but primary book is different
  const REF_PAGE_SIZE = 5;
  const referencingRaw = await getReferencingSermons(bookName, chapterNum, REF_PAGE_SIZE, refOffset);
  const hasMoreRefs = referencingRaw.length > REF_PAGE_SIZE;
  const referencingSermons = referencingRaw.slice(0, REF_PAGE_SIZE);

  // Build referencing pagination URL
  const buildRefUrl = (newOffset: number) => {
    const p = new URLSearchParams();
    if (sort !== 'verse') p.set('sort', sort);
    if (hasTranscript) p.set('transcript', '1');
    if (newOffset > 0) p.set('refOffset', newOffset.toString());
    return `/browse/scripture/${encodeURIComponent(bookName)}/${chapterNum}?${p.toString()}`;
  };

  return (
    <div className="pb-32 animate-fade-in">
      {/* Header */}
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-40 border-b border-white/5">
        <Link href={`/browse/scripture/${encodeURIComponent(bookName)}`} className="text-[var(--accent)] text-xs hover:text-[var(--accent-hover)] transition-colors mb-2 inline-block">
          ← Back to {bookName}
        </Link>
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">
          {bookName} {chapterNum}
        </h1>
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
          {sermons.length} sermon{sermons.length !== 1 ? 's' : ''}
        </p>
      </header>

      <main className="px-4 py-4 space-y-6">
        {/* Filter Bar */}
        <Suspense fallback={null}>
          <FilterBar
            sortOptions={SORT_OPTIONS}
            defaultSort="verse"
            filters={FILTERS}
            resultCount={sermons.length}
          />
        </Suspense>

        {/* Section 1: Primary Sermons */}
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

              return (
                <div key={sermon.id} className="card group relative">
                  <Link
                    href={`/sermons/${sermon.sermon_code}`}
                    className="block"
                  >
                    <div className="flex items-center gap-4">
                      <PlayButton sermon={sermon} size="sm" />

                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-medium text-[var(--text-primary)] line-clamp-2 mb-1 group-hover:text-[var(--accent)] transition-colors">
                          {sermon.title}
                        </h3>

                        {sermon.verse && (
                          <p className="text-[11px] text-[var(--accent)] font-medium mb-1">
                            {sermon.verse}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)] mb-2">
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
                      </div>
                    </div>
                  </Link>
                  <div className="absolute top-2 right-2">
                    <AddToQueueButton sermon={sermon} variant="icon" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-[var(--text-tertiary)] italic">
              No sermons specifically teach through {bookName} {chapterNum}.
            </p>
          </div>
        )}

        {/* Section 2: Referencing Sermons */}
        {(referencingSermons.length > 0 || refOffset > 0) && (
          <div className="border-t border-white/5 pt-6">
            <h3 className="font-serif text-base font-semibold text-[var(--text-primary)] mb-1">
              Sermons that reference {bookName} {chapterNum}
            </h3>
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-4">
              Cross-references from other passages
            </p>

            <div className="space-y-3">
              {referencingSermons.map((sermon) => (
                <div key={sermon.id} className="card group relative">
                  <Link
                    href={`/sermons/${sermon.sermon_code}`}
                    className="block"
                  >
                    <div className="flex items-center gap-4">
                      <PlayButton sermon={sermon} size="sm" />

                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-medium text-[var(--text-primary)] line-clamp-2 mb-1 group-hover:text-[var(--accent)] transition-colors">
                          {sermon.title}
                        </h3>

                        {sermon.verse && (
                          <p className="text-[11px] text-[var(--accent)] font-medium mb-0.5">
                            {sermon.verse}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
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
                      </div>
                    </div>
                  </Link>
                  <div className="absolute top-2 right-2">
                    <AddToQueueButton sermon={sermon} variant="icon" />
                  </div>
                </div>
              ))}
            </div>

            {/* Referencing Pagination */}
            {(refOffset > 0 || hasMoreRefs) && (
              <div className="flex gap-3 justify-center mt-4">
                {refOffset > 0 && (
                  <Link
                    href={buildRefUrl(Math.max(0, refOffset - REF_PAGE_SIZE))}
                    className="btn btn-secondary text-sm"
                  >
                    ← Previous
                  </Link>
                )}
                {hasMoreRefs && (
                  <Link
                    href={buildRefUrl(refOffset + REF_PAGE_SIZE)}
                    className="btn btn-secondary text-sm"
                  >
                    Show More →
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Back link when nothing at all */}
        {sermons.length === 0 && referencingSermons.length === 0 && (
          <div className="text-center pt-4">
            <Link href={`/browse/scripture/${encodeURIComponent(bookName)}`} className="btn btn-secondary">
              ← Back to {bookName}
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
