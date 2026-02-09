import { BookOpen, Search } from 'lucide-react';
import {
  parseScriptureQuery,
  searchTranscriptStudyByReference,
  searchTranscriptStudyByText,
  type TranscriptStudyMode,
  type TranscriptStudyTextMatchMode,
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

function getMultiNumberParams(value: string | string[] | undefined): number[] {
  const values = getMultiParams(value)
    .map((item) => parseInt(item, 10))
    .filter((item) => !Number.isNaN(item));
  return [...new Set(values)];
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

function normalizeMode(value: string | undefined): TranscriptStudyMode {
  return value === 'text' ? 'text' : 'scripture';
}

function normalizeTextMatchMode(value: string | undefined): TranscriptStudyTextMatchMode {
  return value === 'all_words' ? 'all_words' : 'exact';
}

export default async function TranscriptStudyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const searchMode = normalizeMode(getSingleParam(params.mode));

  const rawBookInput = (getSingleParam(params.book) || '').trim();
  const selectedChapter = getNumberParam(params.chapter);
  const selectedVerse = getNumberParam(params.verse);

  const textQuery = (getSingleParam(params.q) || '').trim();
  const textMatchMode = normalizeTextMatchMode(getSingleParam(params.match));

  const selectedYears = getMultiNumberParams(params.year);
  const selectedDoctrines = unique(getMultiParams(params.doctrine));

  const normalizedBook = rawBookInput
    ? parseScriptureQuery(`${rawBookInput} 1`)?.book
    : undefined;

  const availableBooks = sortBooksByCanonicalOrder(BOOK_ORDER);

  const chapterIsValid = selectedChapter !== undefined && selectedChapter > 0;
  const verseIsValid = selectedVerse !== undefined && selectedVerse > 0;
  const canRunScriptureSearch = Boolean(normalizedBook && chapterIsValid && verseIsValid);
  const canRunTextSearch = textQuery.length > 0;
  const canRunSearch = searchMode === 'text' ? canRunTextSearch : canRunScriptureSearch;

  let results: Awaited<ReturnType<typeof searchTranscriptStudyByReference>> | null = null;
  let loadError: string | null = null;

  if (canRunSearch) {
    try {
      if (searchMode === 'text') {
        results = await searchTranscriptStudyByText({
          query: textQuery,
          matchMode: textMatchMode,
          selectedDoctrines,
          selectedYears,
          limit: PAGE_SIZE,
          offset: 0,
        });
      } else {
        results = await searchTranscriptStudyByReference({
          book: normalizedBook!,
          chapter: selectedChapter!,
          verse: selectedVerse!,
          selectedDoctrines,
          selectedYears,
          limit: PAGE_SIZE,
          offset: 0,
        });
      }
    } catch {
      loadError = 'Transcript search hit a temporary connection issue. Please retry the same filter.';
    }
  }

  return (
    <div className="pb-32 animate-fade-in">
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-30 border-b border-white/5">
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">Transcript</h1>
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
          Transcript Study
        </p>
      </header>

      <main className="px-4 py-4 space-y-4">
        <section className="card-elevated space-y-3">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Search Mode</h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href="/transcript-study?mode=scripture"
              className={`btn ${searchMode === 'scripture' ? 'btn-primary' : 'btn-secondary'} text-center`}
            >
              Search by Scripture
            </a>
            <a
              href="/transcript-study?mode=text&match=exact"
              className={`btn ${searchMode === 'text' ? 'btn-primary' : 'btn-secondary'} text-center`}
            >
              Search by Word/Phrase
            </a>
          </div>

          {searchMode === 'text' ? (
            <form action="/transcript-study" method="GET" className="space-y-3">
              <input type="hidden" name="mode" value="text" />

              <label className="text-xs text-[var(--text-secondary)] block">
                <span className="mb-1 block">Word or Phrase</span>
                <input
                  name="q"
                  placeholder="repent and be baptized"
                  defaultValue={textQuery}
                  className="input py-2 px-3 text-sm h-11"
                  autoComplete="off"
                />
              </label>

              <fieldset className="space-y-2">
                <legend className="text-xs text-[var(--text-secondary)]">Match Mode</legend>
                <div className="grid grid-cols-2 gap-2">
                  <label className="tag flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="match"
                      value="exact"
                      defaultChecked={textMatchMode === 'exact'}
                    />
                    <span>Exact phrase</span>
                  </label>
                  <label className="tag flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="match"
                      value="all_words"
                      defaultChecked={textMatchMode === 'all_words'}
                    />
                    <span>All words</span>
                  </label>
                </div>
              </fieldset>

              <button type="submit" className="btn btn-primary w-full">
                Run Transcript Search
              </button>
            </form>
          ) : (
            <form action="/transcript-study" method="GET" className="space-y-3">
              <input type="hidden" name="mode" value="scripture" />
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
                Run Transcript Search
              </button>
            </form>
          )}
        </section>

        {searchMode === 'scripture' && rawBookInput && !normalizedBook && (
          <div className="card text-sm text-[var(--text-secondary)]">
            Book name not recognized. Try a canonical name like <span className="text-[var(--accent)]">James</span>.
          </div>
        )}

        {!canRunSearch && (
          <div className="card text-sm text-[var(--text-secondary)]">
            {searchMode === 'text'
              ? 'Enter a word or phrase to run transcript search.'
              : 'Enter book, chapter, and verse to run transcript search.'}
          </div>
        )}

        {loadError && (
          <div className="card text-sm text-[var(--text-secondary)]">
            {loadError}
          </div>
        )}

        {results && (
          <TranscriptStudyFeed
            initialResult={results}
            mode={searchMode}
            book={normalizedBook}
            chapter={selectedChapter}
            verse={selectedVerse}
            textQuery={textQuery}
            textMatchMode={textMatchMode}
            initialSelectedYears={selectedYears}
            selectedDoctrines={selectedDoctrines}
            pageSize={PAGE_SIZE}
          />
        )}

        <section className="card">
          <div className="flex items-center gap-2 mb-1.5">
            <BookOpen size={14} className="text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">How Transcript Search Works</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Scripture mode finds explicit references that contain your selected verse. Word/Phrase mode finds paragraph context across transcripts, using exact phrase matching or all-words matching.
          </p>
        </section>
      </main>
    </div>
  );
}
