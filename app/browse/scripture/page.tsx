import Link from 'next/link';
import { getAllBooks } from '@/lib/db';

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

export default async function BrowseScripturePage() {
  const booksData = await getAllBooks();

  // Create a map for quick lookup
  const bookMap = new Map(
    booksData.map(book => [book.book, book.sermon_count])
  );

  // Filter books by testament
  const otBooks = OLD_TESTAMENT.filter(name => bookMap.has(name)).map(name => ({
    name,
    count: bookMap.get(name) || 0
  }));

  const ntBooks = NEW_TESTAMENT.filter(name => bookMap.has(name)).map(name => ({
    name,
    count: bookMap.get(name) || 0
  }));

  return (
    <div className="pb-40 animate-fade-in">
      {/* Header */}
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-40 border-b border-white/5">
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">Browse by Scripture</h1>
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
          Bible Books
        </p>
      </header>

      <main className="px-4 py-4 space-y-5">
        {/* Intro */}
        <div className="text-center py-3">
          <div className="text-3xl mb-2">📖</div>
          <p className="text-xs text-[var(--text-secondary)]">
            Find sermons by Bible book, chapter, and verse
          </p>
        </div>

        {/* Old Testament */}
        {otBooks.length > 0 && (
          <section>
            <h2 className="font-serif text-base font-semibold mb-3 text-[var(--text-primary)]">
              Old Testament
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {otBooks.map((book) => (
                <Link
                  key={book.name}
                  href={`/browse/scripture/${encodeURIComponent(book.name)}`}
                  className="card group"
                >
                  <div className="font-serif font-semibold text-sm text-[var(--text-primary)] mb-0.5 group-hover:text-[var(--accent)] transition-colors">
                    {book.name}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    {book.count} sermon{book.count !== 1 ? 's' : ''}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* New Testament */}
        <section>
          <h2 className="font-serif text-base font-semibold mb-3 text-[var(--text-primary)]">
            New Testament
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {ntBooks.map((book) => (
              <Link
                key={book.name}
                href={`/browse/scripture/${encodeURIComponent(book.name)}`}
                className="card group"
              >
                <div className="font-serif font-semibold text-sm text-[var(--text-primary)] mb-0.5 group-hover:text-[var(--accent)] transition-colors">
                  {book.name}
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  {book.count} sermon{book.count !== 1 ? 's' : ''}
                </div>
              </Link>
            ))}
          </div>
        </section>
        {/* Browse by Category */}
        <section>
          <h2 className="font-serif text-base font-semibold mb-3 text-[var(--text-primary)]">
            Browse by Category
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Sermon Type', href: '/browse/metadata/sermon-types', desc: 'Expository, Topical, Q&A...' },
              { label: 'Topic', href: '/browse/topics', desc: '9,000+ topics' },
              { label: 'Keyword', href: '/browse/metadata/keywords', desc: '20,000+ keywords' },
              { label: 'Theme', href: '/browse/metadata/themes', desc: 'Primary themes' },
              { label: 'Doctrine', href: '/browse/metadata/doctrines', desc: 'Doctrines defended' },
              { label: 'Heresy Refuted', href: '/browse/metadata/heresies', desc: 'Heresies addressed' },
              { label: 'Theology', href: '/browse/metadata/categories', desc: 'Theological categories' },
              { label: 'Character', href: '/browse/metadata/characters', desc: 'Biblical people' },
              { label: 'Place', href: '/browse/metadata/places', desc: 'Biblical locations' },
              { label: 'Author Quoted', href: '/browse/metadata/authors', desc: 'Cited scholars & pastors' },
              { label: 'Hymn', href: '/browse/metadata/hymns', desc: 'Hymns referenced' },
              { label: 'Book Referenced', href: '/browse/metadata/books-referenced', desc: 'Books cited' },
            ].map((cat) => (
              <Link
                key={cat.label}
                href={cat.href}
                className="card group"
              >
                <div className="font-serif font-semibold text-sm text-[var(--text-primary)] mb-0.5 group-hover:text-[var(--accent)] transition-colors">
                  {cat.label}
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  {cat.desc}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
