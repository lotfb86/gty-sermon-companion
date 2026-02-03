import Link from 'next/link';
import { BookOpen, Download, Search } from 'lucide-react';
import {
  getAllBooks,
  getChaptersForBook,
  getVersesForBookChapter,
  searchTranscriptStudyByReference,
  type TranscriptStudyFacet,
} from '@/lib/db';

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

function buildTranscriptStudyHref(options: {
  book?: string;
  chapter?: number;
  verse?: number;
  year?: number;
  doctrines?: string[];
  offset?: number;
}): string {
  const params = new URLSearchParams();
  if (options.book) params.set('book', options.book);
  if (options.chapter) params.set('chapter', String(options.chapter));
  if (options.verse) params.set('verse', String(options.verse));
  if (options.year) params.set('year', String(options.year));
  for (const doctrine of options.doctrines || []) {
    params.append('doctrine', doctrine);
  }
  if ((options.offset || 0) > 0) {
    params.set('offset', String(options.offset));
  }
  const queryString = params.toString();
  return `/transcript-study${queryString ? `?${queryString}` : ''}`;
}

function hasDoctrineSelected(selected: string[], doctrine: string): boolean {
  return selected.includes(doctrine);
}

function getToggledDoctrines(selected: string[], doctrine: string): string[] {
  if (selected.includes(doctrine)) {
    return selected.filter((item) => item !== doctrine);
  }
  return [...selected, doctrine];
}

function renderFacetLabel(facet: TranscriptStudyFacet): string {
  return `${facet.value} (${facet.count})`;
}

export default async function TranscriptStudyPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const selectedBook = getSingleParam(params.book);
  const selectedChapter = getNumberParam(params.chapter);
  const selectedVerse = getNumberParam(params.verse);
  const selectedYear = getNumberParam(params.year);
  const selectedDoctrines = unique(getMultiParams(params.doctrine));
  const offset = Math.max(0, getNumberParam(params.offset) || 0);

  const booksRaw = await getAllBooks();
  const availableBooks = sortBooksByCanonicalOrder(booksRaw.map((item) => item.book));

  const chapters = selectedBook ? await getChaptersForBook(selectedBook) : [];
  const chapterOptions = chapters.map((item) => item.chapter).sort((a, b) => a - b);
  const chapterIsValid = selectedChapter !== undefined && chapterOptions.includes(selectedChapter);

  const verses = selectedBook && chapterIsValid
    ? await getVersesForBookChapter(selectedBook, selectedChapter)
    : [];
  const verseIsValid = selectedVerse !== undefined && verses.includes(selectedVerse);

  const canRunSearch = Boolean(selectedBook && chapterIsValid && verseIsValid);

  const results = canRunSearch
    ? await searchTranscriptStudyByReference({
        book: selectedBook!,
        chapter: selectedChapter!,
        verse: selectedVerse!,
        selectedDoctrines,
        year: selectedYear,
        limit: PAGE_SIZE,
        offset,
      })
    : null;

  const selectedReference = canRunSearch
    ? `${selectedBook} ${selectedChapter}:${selectedVerse}`
    : '';

  const currentSearchHref = buildTranscriptStudyHref({
    book: selectedBook,
    chapter: selectedChapter,
    verse: selectedVerse,
    year: selectedYear,
    doctrines: selectedDoctrines,
  });
  const currentSearchQuery = currentSearchHref.includes('?')
    ? currentSearchHref.split('?')[1]
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
                <select name="book" defaultValue={selectedBook || ''} className="input py-2 px-3 text-sm h-11">
                  <option value="">Select</option>
                  {availableBooks.map((book) => (
                    <option key={book} value={book}>
                      {book}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-[var(--text-secondary)]">
                <span className="mb-1 block">Chapter</span>
                <select
                  name="chapter"
                  defaultValue={chapterIsValid ? String(selectedChapter) : ''}
                  className="input py-2 px-3 text-sm h-11 disabled:opacity-40"
                  disabled={!selectedBook}
                >
                  <option value="">Select</option>
                  {chapterOptions.map((chapter) => (
                    <option key={chapter} value={chapter}>
                      {chapter}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-[var(--text-secondary)]">
                <span className="mb-1 block">Verse</span>
                <select
                  name="verse"
                  defaultValue={verseIsValid ? String(selectedVerse) : ''}
                  className="input py-2 px-3 text-sm h-11 disabled:opacity-40"
                  disabled={!chapterIsValid}
                >
                  <option value="">Select</option>
                  {verses.map((verse) => (
                    <option key={verse} value={verse}>
                      {verse}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button type="submit" className="btn btn-primary w-full">
              {canRunSearch ? 'Run Bill Search' : 'Load Next Input'}
            </button>
          </form>
        </section>

        {!canRunSearch && (
          <div className="card text-sm text-[var(--text-secondary)]">
            Select all three fields (book, chapter, verse) to run Bill Search.
          </div>
        )}

        {results && (
          <>
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                  Results ({results.total_items})
                </h3>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {selectedBook} {selectedChapter}:{selectedVerse}
                </span>
              </div>

              {results.year_facets.length > 0 && (
                <form action="/transcript-study" method="GET" className="card p-3">
                  <input type="hidden" name="book" value={selectedBook} />
                  <input type="hidden" name="chapter" value={selectedChapter} />
                  <input type="hidden" name="verse" value={selectedVerse} />
                  {selectedDoctrines.map((doctrine) => (
                    <input key={doctrine} type="hidden" name="doctrine" value={doctrine} />
                  ))}
                  <div className="flex items-end gap-2">
                    <label className="flex-1 text-xs text-[var(--text-secondary)]">
                      <span className="mb-1 block">Year Filter</span>
                      <select name="year" defaultValue={selectedYear ? String(selectedYear) : ''} className="input py-2 px-3 text-sm h-11">
                        <option value="">All years</option>
                        {results.year_facets.map((facet) => (
                          <option key={facet.value} value={facet.value}>
                            {renderFacetLabel(facet)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="submit" className="btn btn-secondary h-11 px-4">
                      Apply
                    </button>
                  </div>
                </form>
              )}

              {results.doctrine_facets.length > 0 && (
                <div className="card p-3 space-y-2">
                  <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-[0.15em]">
                    Doctrine Filter
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={buildTranscriptStudyHref({
                        book: selectedBook,
                        chapter: selectedChapter,
                        verse: selectedVerse,
                        year: selectedYear,
                        doctrines: [],
                      })}
                      className={`tag ${selectedDoctrines.length === 0 ? 'tag-active' : ''}`}
                    >
                      All Doctrines
                    </Link>
                    {results.doctrine_facets.map((facet) => {
                      const active = hasDoctrineSelected(selectedDoctrines, facet.value);
                      const nextDoctrines = getToggledDoctrines(selectedDoctrines, facet.value);
                      return (
                        <Link
                          key={facet.value}
                          href={buildTranscriptStudyHref({
                            book: selectedBook,
                            chapter: selectedChapter,
                            verse: selectedVerse,
                            year: selectedYear,
                            doctrines: nextDoctrines,
                          })}
                          className={`tag ${active ? 'tag-active' : ''}`}
                        >
                          {renderFacetLabel(facet)}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            {results.items.length === 0 ? (
              <div className="card text-sm text-[var(--text-secondary)]">
                No transcript references match these filters.
              </div>
            ) : (
              <section className="space-y-4">
                {results.items.map((item) => (
                  <article key={item.id} className="card-elevated space-y-3">
                    <div className="pb-2 border-b border-white/10">
                      <h3 className="font-serif text-base font-semibold text-[var(--text-primary)]">{item.title}</h3>
                      <div className="text-xs text-[var(--text-secondary)] mt-1 flex flex-wrap gap-2">
                        {item.date_preached && (
                          <span>{new Date(item.date_preached).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        )}
                        {item.primary_reference && (
                          <span className="text-[var(--accent)]">Primary Text: {item.primary_reference}</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {item.occurrences.map((occurrence, index) => (
                        <div key={`${item.id}-${index}`} className="rounded-xl border border-white/10 bg-[var(--surface)] p-3 space-y-2">
                          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                            {occurrence.paragraph}
                          </p>
                          <div className="text-[11px] font-medium text-[var(--accent)]">
                            Matched Reference: {occurrence.matched_reference}
                          </div>
                          <div className="rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-2.5">
                            <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)] mb-1">
                              How It Was Used
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                              {occurrence.usage_context || 'No usage summary available for this passage in sermon metadata.'}
                            </p>
                          </div>
                        </div>
                      ))}
                      </div>

                    <div className="pt-1">
                      <Link href={`/sermons/${item.sermon_code}?t=${encodeURIComponent(selectedReference)}`} className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
                        Open sermon →
                      </Link>
                    </div>
                  </article>
                ))}

                {(offset > 0 || results.has_more) && (
                  <div className="flex justify-center gap-3">
                    {offset > 0 && (
                      <Link
                        href={buildTranscriptStudyHref({
                          book: selectedBook,
                          chapter: selectedChapter,
                          verse: selectedVerse,
                          year: selectedYear,
                          doctrines: selectedDoctrines,
                          offset: Math.max(0, offset - PAGE_SIZE),
                        })}
                        className="btn btn-secondary text-sm"
                      >
                        ← Previous
                      </Link>
                    )}
                    {results.has_more && (
                      <Link
                        href={buildTranscriptStudyHref({
                          book: selectedBook,
                          chapter: selectedChapter,
                          verse: selectedVerse,
                          year: selectedYear,
                          doctrines: selectedDoctrines,
                          offset: offset + PAGE_SIZE,
                        })}
                        className="btn btn-primary text-sm"
                      >
                        More Results →
                      </Link>
                    )}
                  </div>
                )}
              </section>
            )}

            {results.total_items > 0 && (
              <section className="card-elevated space-y-3">
                <div className="flex items-center gap-2">
                  <Download size={16} className="text-[var(--accent)]" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Export This Feed</h3>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/api/transcript-study/export?${currentSearchQuery}&format=pdf`}
                    className="btn btn-secondary flex-1"
                  >
                    PDF
                  </a>
                  <a
                    href={`/api/transcript-study/export?${currentSearchQuery}&format=docx`}
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
