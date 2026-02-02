import Link from 'next/link';
import { getChaptersForBook, getSermonsByScripture } from '@/lib/db';
import BottomNav from '@/components/BottomNav';
import BookCover from '@/components/BookCover';

export default async function ScriptureBookPage({
  params,
}: {
  params: Promise<{ book: string }>;
}) {
  const { book } = await params;
  const bookName = decodeURIComponent(book);
  const chapters = await getChaptersForBook(bookName);
  const allSermons = await getSermonsByScripture(bookName, undefined, undefined, 10);

  return (
    <div className="pb-32 animate-fade-in">
      {/* Header */}
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-40 border-b border-white/5">
        <Link href="/browse/scripture" className="text-[var(--accent)] text-xs hover:text-[var(--accent-hover)] transition-colors mb-2 inline-block">
          ← Back to Scripture
        </Link>
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">
          {bookName}
        </h1>
      </header>

      <main className="px-4 py-4 space-y-5">
        {/* Chapters */}
        {chapters.length > 0 && (
          <section>
            <h2 className="font-serif text-lg font-semibold mb-4 text-[var(--text-primary)]">
              Chapters
            </h2>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {chapters.map((chapter) => {
                const crossRefs = chapter.total_count - chapter.sermon_count;
                return (
                  <Link
                    key={chapter.chapter}
                    href={`/browse/scripture/${encodeURIComponent(bookName)}/${chapter.chapter}`}
                    className="card text-center py-3 group"
                  >
                    <div className="font-serif font-semibold text-lg text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      {chapter.chapter}
                    </div>
                    <div className="flex flex-col items-center mt-1">
                      <span className="text-xs font-semibold text-[var(--text-tertiary)]">
                        {chapter.sermon_count}
                      </span>
                      {crossRefs > 0 && (
                        <span className="text-[9px] text-[var(--text-quaternary)]">
                          +{crossRefs} ref{crossRefs !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent Sermons */}
        <section>
          <h2 className="font-serif text-lg font-semibold mb-4 text-[var(--text-primary)]">
            Recent Sermons
          </h2>
            <div className="space-y-3">
              {allSermons.slice(0, 5).map((sermon) => {
                let metadata: any = null;
                try {
                  metadata = sermon.llm_metadata ? JSON.parse(sermon.llm_metadata) : null;
                } catch (e) {
                  // ignore
                }

                return (
                  <Link
                    key={sermon.id}
                    href={`/sermons/${sermon.sermon_code}`}
                    className="card"
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <BookCover title={sermon.title} size="sm" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-semibold text-sm text-[var(--text-primary)] mb-1 line-clamp-2">
                          {sermon.title}
                        </h3>

                        {sermon.date_preached && (
                          <div className="text-xs text-[var(--text-tertiary)] mb-2">
                            {new Date(sermon.date_preached).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                        )}

                        {metadata?.topics && metadata.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {metadata.topics.slice(0, 2).map((topic: string, idx: number) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-1 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-full text-[var(--text-tertiary)]"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {allSermons.length > 5 && (
              <Link
                href={`/browse/scripture/${encodeURIComponent(bookName)}/all`}
                className="btn btn-secondary w-full mt-4"
              >
                View all sermons →
              </Link>
            )}
          </section>
      </main>
    </div>
  );
}
