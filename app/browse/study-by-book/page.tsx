import Link from 'next/link';
import { getBooksWithSeriesCounts } from '@/lib/db';
import BottomNav from '@/components/BottomNav';
import BookCover from '@/components/BookCover';

// Bible books in canonical order
const OLD_TESTAMENT = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
  '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther',
  'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
  'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
  'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah',
  'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'
];

const NEW_TESTAMENT = [
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon',
  'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'
];

export default async function StudyByBookPage() {
  const booksData = await getBooksWithSeriesCounts();

  // Create a map for quick lookup
  const bookMap = new Map(
    booksData.map(book => [book.book, book])
  );

  // Filter books by testament
  const otBooks = OLD_TESTAMENT.map(name => bookMap.get(name)).filter(Boolean);
  const ntBooks = NEW_TESTAMENT.map(name => bookMap.get(name)).filter(Boolean);

  return (
    <div className="pb-32 animate-fade-in">
      {/* Header */}
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-40 border-b border-white/5">
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">
          Study by Book
        </h1>
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
          Sermon Series
        </p>
      </header>

      <main className="px-4 py-4 space-y-5">
        {/* Page Header */}
        <div className="text-center py-4">
          <div className="text-4xl mb-3">📚</div>
          <p className="text-sm text-[var(--text-secondary)]">
            Study complete sermon series that teach through biblical books
          </p>
        </div>

        {/* Old Testament */}
        {otBooks.length > 0 && (
          <section>
            <h2 className="font-serif text-lg font-semibold mb-4 text-[var(--text-primary)]">
              Old Testament
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {otBooks.map((book: any) => (
                <Link
                  key={book.book}
                  href={`/browse/study-by-book/${encodeURIComponent(book.book)}`}
                  className="flex flex-col items-center"
                >
                  <BookCover title={book.book} subtitle={`${book.sermon_count} ${book.sermon_count === 1 ? 'sermon' : 'sermons'}`} size="md" />
                  <div className="mt-2 text-center w-full">
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {book.sermon_count} {book.sermon_count === 1 ? 'sermon' : 'sermons'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* New Testament */}
        <section>
          <h2 className="font-serif text-lg font-semibold mb-4 text-[var(--text-primary)]">
            New Testament
          </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {ntBooks.map((book: any) => (
                <Link
                  key={book.book}
                  href={`/browse/study-by-book/${encodeURIComponent(book.book)}`}
                  className="flex flex-col items-center"
                >
                  <BookCover title={book.book} subtitle={`${book.sermon_count} ${book.sermon_count === 1 ? 'sermon' : 'sermons'}`} size="md" />
                  <div className="mt-2 text-center w-full">
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {book.sermon_count} {book.sermon_count === 1 ? 'sermon' : 'sermons'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
      </main>
    </div>
  );
}
