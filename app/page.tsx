import Link from 'next/link';
import { getBooksWithSeriesCounts, getAllTopics, getCachedMetadataValues } from '@/lib/db';
import BookCover from '@/components/BookCover';
import ContinueListening from '@/components/ContinueListening';
import MetadataTagList from '@/components/MetadataTagList';

export default async function HomePage() {
  const topBooks = (await getBooksWithSeriesCounts()).slice(0, 8);
  const topTopics = (await getAllTopics()).slice(0, 12);
  const topDoctrines = await getCachedMetadataValues('doctrines', { limit: 8 });
  const topHeresies = await getCachedMetadataValues('heresies', { limit: 6 });
  const topThemes = await getCachedMetadataValues('themes', { limit: 12 });

  return (
    <div className="pb-40 space-y-6 animate-fade-in">
      {/* Header */}
      <header className="px-4 pt-10 pb-3 sticky top-0 z-30 glass border-b border-white/5">
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">GTY Companion</h1>
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
          John MacArthur
        </p>
      </header>

      <section className="px-4">
        <ContinueListening />
      </section>

      {/* Study by Book */}
      <section className="space-y-3">
        <div className="px-4 flex justify-between items-end">
          <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">
            Study by Book
          </h2>
          <Link
            href="/browse/study-by-book"
            className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            View All
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto px-4 pb-3 no-scrollbar snap-x">
          {topBooks.map((book) => (
            <Link
              key={book.book}
              href={`/browse/study-by-book/${encodeURIComponent(book.book)}`}
              className="snap-start shrink-0"
            >
              <BookCover title={book.book} subtitle={`${book.sermon_count} sermons`} size="sm" />
            </Link>
          ))}
        </div>
      </section>

      {/* Browse by Topic - Tags */}
      <section className="px-4 space-y-3">
        <div className="flex justify-between items-end">
          <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">
            Browse by Topic
          </h2>
          <Link
            href="/browse/topics"
            className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            View All
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {topTopics.map((topic) => (
            <Link
              key={topic.id}
              href={`/topics/${topic.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                bg-[var(--surface)] border border-[var(--border-subtle)]
                text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40
                transition-all"
            >
              <span>{topic.name}</span>
              <span className="text-[var(--text-quaternary)]">{topic.sermon_count}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Doctrines */}
      <section className="px-4 space-y-4">
        <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">
          Doctrines
        </h2>

        {/* Doctrines Defended */}
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Doctrines Defended
          </h3>
          <MetadataTagList
            items={topDoctrines}
            basePath="/browse/metadata/doctrines"
            limit={8}
            viewAllHref="/browse/metadata/doctrines"
          />
        </div>

        {/* Heresies Refuted */}
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Heresies Refuted
          </h3>
          <MetadataTagList
            items={topHeresies}
            basePath="/browse/metadata/heresies"
            limit={6}
            viewAllHref="/browse/metadata/heresies"
          />
        </div>
      </section>

      {/* Study by Theme */}
      <section className="px-4 space-y-3">
        <div className="flex justify-between items-end">
          <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">
            Study by Theme
          </h2>
          <Link
            href="/browse/metadata/themes"
            className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            View All
          </Link>
        </div>

        <MetadataTagList
          items={topThemes}
          basePath="/browse/metadata/themes"
          limit={12}
          viewAllHref="/browse/metadata/themes"
        />
      </section>
    </div>
  );
}
