import { BookOpen, Download, Search } from 'lucide-react';
import {
  getAllBooks,
  parseScriptureQuery,
  searchTranscriptStudyByReference,
} from '@/lib/db';
import TranscriptStudyFeed from '@/components/transcript-study/TranscriptStudyFeed';

const OLD_TESTAMENT = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
  '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther',
  'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
  'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
  'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah',
  'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
];

const NEW_TESTAMENT = [
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon',
  'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation',
];

const BOOK_ORDER = [...OLD_TESTAMENT, ...NEW_TESTAMENT];
const PAGE_SIZE = 6;

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getSingleParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getNumberParam(value: string | string[] | undefined): number | undefined {
  const raw = getSingleParam(value);
  if (!raw) return undefined;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function getMultiParams(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item) => item.trim().length > 0);
  return [value].filter((item) => item.trim().length > 0);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function sortBooksByCanonicalOrder(books: string[]): string[] {
  const canonicalIndex = new Map(BOOK_ORDER.map((book, idx) => [book, idx]));
  return [...books].sort((a, b) => {
    const idxA = canonicalIndex.get(a);
    const idxB = canonicalIndex.get(b);

    if (idxA !== undefined && idxB !== undefined) return idxA - idxB;
    if (idxA !== undefined) return -1;
    if (idxB !== undefined) return 1;
    return a.localeCompare(b);
  });
}

function buildExportQuery(options: {
  book: string;
  chapter: number;
  verse: number;
  year?: number;
  doctrines: string[];
}): string {
  const params = new URLSearchParams();
  params.set('book', options.book);
  params.set('chapter', String(options.chapter));
  params.set('verse', String(options.verse));
  if (options.year) params.set('year', String(options.year));
  for (const doctrine of options.doctrines) {
    params.append('doctrine', doctrine);
  }
  return params.toString();
}

export default async function TranscriptStudyPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const rawBookInput = (getSingleParam(params.book) || '').trim();
  const selectedChapter = getNumberParam(params.chapter);
  const selectedVerse = getNumberParam(params.verse);
  const selectedYear = getNumberParam(params.year);
  const selectedDoctrines = unique(getMultiParams(params.doctrine));

  const normalizedBook = rawBookInput
    ? parseScriptureQuery(`${rawBookInput} 1`)?.book
    : undefined;

  const booksRaw = await getAllBooks();
  const availableBooks = sortBooksByCanonicalOrder(booksRaw.map((item) => item.book));

  const chapterIsValid = selectedChapter !== undefined && selectedChapter > 0;
  const verseIsValid = selectedVerse !== undefined && selectedVerse > 0;
  const canRunSearch = Boolean(normalizedBook && chapterIsValid && verseIsValid);

  const results = canRunSearch
    ? await searchTranscriptStudyByReference({
        book: normalizedBook!,
        chapter: selectedChapter!,
        verse: selectedVerse!,
        selectedDoctrines,
        year: selectedYear,
        limit: PAGE_SIZE,
        offset: 0,
      })
    : null;

  const exportQuery = canRunSearch
    ? buildExportQuery({
        book: normalizedBook!,
        chapter: selectedChapter!,
        verse: selectedVerse!,
        year: selectedYear,
        doctrines: selectedDoctrines,
      })
    : '';

  return (
    <div className="pb-32 animate-fade-in">
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-40 border-b border-white/5">
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">Bill Search</h1>
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
          Transcript Study
        </p>
      </header>

      <main className="px-4 py-4 space-y-4">
        <section className="card-elevated space-y-3">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Reference Picker</h2>
          </div>
          <form action="/transcript-study" method="GET" className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs text-[var(--text-secondary)]">
                <span className="mb-1 block">Book</span>
                <input
                  name="book"
                  list="bill-book-options"
                  placeholder="Romans"
                  defaultValue={rawBookInput}
                  className="input py-2 px-3 text-sm h-11"
                  autoComplete="off"
                />
                <datalist id="bill-book-options">
                  {availableBooks.map((book) => (
                    <option key={book} value={book} />
                  ))}
                </datalist>
              </label>

              <label className="text-xs text-[var(--text-secondary)]">
                <span className="mb-1 block">Chapter</span>
                <input
                  name="chapter"
                  type="number"
                  min={1}
                  placeholder="12"
                  defaultValue={selectedChapter ? String(selectedChapter) : ''}
                  className="input py-2 px-3 text-sm h-11"
                />
              </label>

              <label className="text-xs text-[var(--text-secondary)]">
                <span className="mb-1 block">Verse</span>
                <input
                  name="verse"
                  type="number"
                  min={1}
                  placeholder="2"
                  defaultValue={selectedVerse ? String(selectedVerse) : ''}
                  className="input py-2 px-3 text-sm h-11"
                />
              </label>
            </div>
            <button type="submit" className="btn btn-primary w-full">
              Run Bill Search
            </button>
          </form>
        </section>

        {rawBookInput && !normalizedBook && (
          <div className="card text-sm text-[var(--text-secondary)]">
            Book name not recognized. Try a canonical name like <span className="text-[var(--accent)]">James</span>.
          </div>
        )}

        {!canRunSearch && !rawBookInput && (
          <div className="card text-sm text-[var(--text-secondary)]">
            Enter book, chapter, and verse to run Bill Search.
          </div>
        )}

        {results && (
          <>
            <TranscriptStudyFeed
              initialResult={results}
              book={normalizedBook!}
              chapter={selectedChapter!}
              verse={selectedVerse!}
              year={selectedYear}
              selectedDoctrines={selectedDoctrines}
              pageSize={PAGE_SIZE}
            />

            {results.total_items > 0 && (
              <section className="card-elevated space-y-3" id="export-feed">
                <div className="flex items-center gap-2">
                  <Download size={16} className="text-[var(--accent)]" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Export This Feed</h3>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/api/transcript-study/export?${exportQuery}&format=pdf`}
                    className="btn btn-secondary flex-1"
                  >
                    PDF
                  </a>
                  <a
                    href={`/api/transcript-study/export?${exportQuery}&format=docx`}
                    className="btn btn-secondary flex-1"
                  >
                    DOCX
                  </a>
                </div>
              </section>
            )}
          </>
        )}

        <section className="card">
          <div className="flex items-center gap-2 mb-1.5">
            <BookOpen size={14} className="text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">How Bill Search Works</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Bill Search scans transcripts for explicit references that contain your chosen verse, then groups every matching paragraph by sermon with the metadata usage summary.
          </p>
        </section>
      </main>
    </div>
  );
}
