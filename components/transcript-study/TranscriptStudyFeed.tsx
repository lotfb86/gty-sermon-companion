'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Download } from 'lucide-react';
import type { TranscriptStudyFacet, TranscriptStudySearchResult, TranscriptStudySermonGroup } from '@/lib/db';

interface TranscriptStudyFeedProps {
  initialResult: TranscriptStudySearchResult;
  book: string;
  chapter: number;
  verse: number;
  initialSelectedYears: number[];
  selectedDoctrines: string[];
  pageSize?: number;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightReference(text: string, reference: string): string {
  if (!reference) return text;
  const regex = new RegExp(`(${escapeRegex(reference)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function normalizeNumberList(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function normalizeStringList(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function sameNumberSelections(a: number[], b: number[]): boolean {
  const na = normalizeNumberList(a);
  const nb = normalizeNumberList(b);
  if (na.length !== nb.length) return false;
  return na.every((value, index) => value === nb[index]);
}

function sameStringSelections(a: string[], b: string[]): boolean {
  const na = normalizeStringList(a);
  const nb = normalizeStringList(b);
  if (na.length !== nb.length) return false;
  return na.every((value, index) => value === nb[index]);
}

function buildParams(options: {
  book: string;
  chapter: number;
  verse: number;
  years: number[];
  doctrines: string[];
  offset?: number;
  limit?: number;
}): URLSearchParams {
  const params = new URLSearchParams();
  params.set('book', options.book);
  params.set('chapter', String(options.chapter));
  params.set('verse', String(options.verse));
  for (const year of normalizeNumberList(options.years)) {
    params.append('year', String(year));
  }
  for (const doctrine of normalizeStringList(options.doctrines)) {
    params.append('doctrine', doctrine);
  }
  if ((options.offset || 0) > 0) params.set('offset', String(options.offset));
  if (options.limit) params.set('limit', String(options.limit));
  return params;
}

function toggleYear(selected: number[], year: number): number[] {
  if (selected.includes(year)) return selected.filter((item) => item !== year);
  return [...selected, year];
}

function toggleDoctrine(selected: string[], doctrine: string): string[] {
  if (selected.includes(doctrine)) return selected.filter((item) => item !== doctrine);
  return [...selected, doctrine];
}

function mergeBySermonCode(existing: TranscriptStudySermonGroup[], incoming: TranscriptStudySermonGroup[]): TranscriptStudySermonGroup[] {
  const map = new Map<string, TranscriptStudySermonGroup>();
  for (const item of existing) map.set(item.sermon_code, item);
  for (const item of incoming) {
    if (!map.has(item.sermon_code)) map.set(item.sermon_code, item);
  }
  return [...map.values()];
}

function FilterSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div key={item} className="card-elevated animate-pulse h-28" />
      ))}
    </div>
  );
}

export default function TranscriptStudyFeed({
  initialResult,
  book,
  chapter,
  verse,
  initialSelectedYears,
  selectedDoctrines,
  pageSize = 6,
}: TranscriptStudyFeedProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [resultMeta, setResultMeta] = useState<TranscriptStudySearchResult>(initialResult);
  const [items, setItems] = useState<TranscriptStudySermonGroup[]>(initialResult.items);
  const [hasMore, setHasMore] = useState(initialResult.has_more);
  const [nextOffset, setNextOffset] = useState(initialResult.items.length);

  const [appliedYears, setAppliedYears] = useState<number[]>(normalizeNumberList(initialSelectedYears));
  const [appliedDoctrines, setAppliedDoctrines] = useState<string[]>(normalizeStringList(selectedDoctrines));

  const [pendingYears, setPendingYears] = useState<number[]>(normalizeNumberList(initialSelectedYears));
  const [pendingDoctrines, setPendingDoctrines] = useState<string[]>(normalizeStringList(selectedDoctrines));

  const [filterLoading, setFilterLoading] = useState(false);
  const [appendLoading, setAppendLoading] = useState(false);
  const [showAllDoctrines, setShowAllDoctrines] = useState(false);
  const [showAllYears, setShowAllYears] = useState(false);

  useEffect(() => {
    const normalizedYears = normalizeNumberList(initialSelectedYears);
    const normalizedDoctrines = normalizeStringList(selectedDoctrines);

    setResultMeta(initialResult);
    setItems(initialResult.items);
    setHasMore(initialResult.has_more);
    setNextOffset(initialResult.items.length);

    setAppliedYears(normalizedYears);
    setAppliedDoctrines(normalizedDoctrines);
    setPendingYears(normalizedYears);
    setPendingDoctrines(normalizedDoctrines);

    setFilterLoading(false);
    setAppendLoading(false);
  }, [initialResult, initialSelectedYears, selectedDoctrines]);

  const sortedDoctrines = useMemo(
    () => [...resultMeta.doctrine_facets].sort((a, b) => a.value.localeCompare(b.value)),
    [resultMeta.doctrine_facets]
  );
  const visibleDoctrines = showAllDoctrines ? sortedDoctrines : sortedDoctrines.slice(0, 5);

  const sortedYears = useMemo(
    () => [...resultMeta.year_facets].sort((a, b) => Number(b.value) - Number(a.value)),
    [resultMeta.year_facets]
  );
  const visibleYears = showAllYears ? sortedYears : sortedYears.slice(0, 5);

  const applyFilters = useCallback(
    async (years: number[], doctrines: string[]) => {
      const normalizedYears = normalizeNumberList(years);
      const normalizedDoctrines = normalizeStringList(doctrines);

      setFilterLoading(true);
      setItems([]);
      setHasMore(false);
      setNextOffset(0);

      try {
        const params = buildParams({
          book,
          chapter,
          verse,
          years: normalizedYears,
          doctrines: normalizedDoctrines,
          offset: 0,
          limit: pageSize,
        });

        const response = await fetch(`/api/transcript-study/search?${params.toString()}`);
        if (!response.ok) throw new Error('Failed filter update');

        const data = (await response.json()) as TranscriptStudySearchResult;
        setResultMeta(data);
        setItems(data.items || []);
        setHasMore(Boolean(data.has_more));
        setNextOffset((data.items || []).length);

        setAppliedYears(normalizedYears);
        setAppliedDoctrines(normalizedDoctrines);
        window.history.replaceState({}, '', `/transcript-study?${params.toString()}`);
      } finally {
        setFilterLoading(false);
      }
    },
    [book, chapter, pageSize, verse]
  );

  const applyYears = useCallback(async () => {
    await applyFilters(pendingYears, appliedDoctrines);
  }, [applyFilters, appliedDoctrines, pendingYears]);

  const applyDoctrines = useCallback(async () => {
    await applyFilters(appliedYears, pendingDoctrines);
  }, [applyFilters, appliedYears, pendingDoctrines]);

  const fetchMore = useCallback(async () => {
    if (appendLoading || filterLoading || !hasMore) return;
    setAppendLoading(true);
    try {
      const params = buildParams({
        book,
        chapter,
        verse,
        years: appliedYears,
        doctrines: appliedDoctrines,
        offset: nextOffset,
        limit: pageSize,
      });
      const response = await fetch(`/api/transcript-study/search?${params.toString()}`);
      if (!response.ok) return;

      const data = (await response.json()) as TranscriptStudySearchResult;
      setItems((prev) => mergeBySermonCode(prev, data.items || []));
      setHasMore(Boolean(data.has_more));
      setNextOffset((prev) => prev + (data.items?.length || 0));
      setResultMeta((prev) => ({
        ...prev,
        total_items: data.total_items,
        has_more: data.has_more,
        doctrine_facets: data.doctrine_facets,
        year_facets: data.year_facets,
      }));
    } finally {
      setAppendLoading(false);
    }
  }, [
    appendLoading,
    appliedDoctrines,
    appliedYears,
    book,
    chapter,
    filterLoading,
    hasMore,
    nextOffset,
    pageSize,
    verse,
  ]);

  useEffect(() => {
    if (!hasMore || filterLoading) return;
    const target = sentinelRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          void fetchMore();
        }
      },
      { rootMargin: '500px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchMore, filterLoading, hasMore]);

  const yearsDirty = !sameNumberSelections(pendingYears, appliedYears);
  const doctrinesDirty = !sameStringSelections(pendingDoctrines, appliedDoctrines);

  const selectedReference = `${book} ${chapter}:${verse}`;
  const exportQuery = buildParams({
    book,
    chapter,
    verse,
    years: appliedYears,
    doctrines: appliedDoctrines,
  }).toString();

  return (
    <section className="space-y-4">
      <div className="card-elevated">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-1">Bill Search Reference</div>
        <div className="text-xl font-serif font-semibold text-[var(--gold-text)]">{selectedReference}</div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-4xl font-bold text-[var(--accent)] leading-none">{resultMeta.total_items}</div>
            <div className="text-xs text-[var(--text-secondary)]">sermons with matching transcript context</div>
          </div>
          {(appliedYears.length > 0 || appliedDoctrines.length > 0) && (
            <div className="text-xs text-[var(--text-secondary)] text-right">
              {appliedYears.length > 0 && <div>Years: <span className="text-[var(--accent)]">{appliedYears.join(', ')}</span></div>}
              {appliedDoctrines.length > 0 && <div>Doctrines: <span className="text-[var(--accent)]">{appliedDoctrines.length}</span></div>}
            </div>
          )}
        </div>
      </div>

      {sortedYears.length > 0 && (
        <div className="card p-3 space-y-2">
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-[0.15em]">Year Filter</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPendingYears([])}
              className={`tag ${pendingYears.length === 0 ? 'tag-active' : ''}`}
            >
              All Years
            </button>
            {visibleYears.map((facet: TranscriptStudyFacet) => {
              const yearValue = Number(facet.value);
              const active = pendingYears.includes(yearValue);
              return (
                <button
                  key={facet.value}
                  type="button"
                  onClick={() => setPendingYears((prev) => toggleYear(prev, yearValue))}
                  className={`tag ${active ? 'tag-active' : ''}`}
                >
                  {facet.value} ({facet.count})
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            {sortedYears.length > 5 ? (
              <button
                type="button"
                onClick={() => setShowAllYears((prev) => !prev)}
                className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
              >
                {showAllYears ? 'Show Top 5' : `Show All (${sortedYears.length})`}
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => void applyYears()}
              disabled={!yearsDirty || filterLoading}
              className="btn btn-secondary text-xs px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {sortedDoctrines.length > 0 && (
        <div className="card p-3 space-y-2">
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-[0.15em]">Doctrine Filter</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPendingDoctrines([])}
              className={`tag ${pendingDoctrines.length === 0 ? 'tag-active' : ''}`}
            >
              All Doctrines
            </button>
            {visibleDoctrines.map((facet: TranscriptStudyFacet) => {
              const active = pendingDoctrines.includes(facet.value);
              return (
                <button
                  key={facet.value}
                  type="button"
                  onClick={() => setPendingDoctrines((prev) => toggleDoctrine(prev, facet.value))}
                  className={`tag ${active ? 'tag-active' : ''}`}
                >
                  {facet.value} ({facet.count})
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            {sortedDoctrines.length > 5 ? (
              <button
                type="button"
                onClick={() => setShowAllDoctrines((prev) => !prev)}
                className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
              >
                {showAllDoctrines ? 'Show Top 5' : `Show All (${sortedDoctrines.length})`}
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => void applyDoctrines()}
              disabled={!doctrinesDirty || filterLoading}
              className="btn btn-secondary text-xs px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {resultMeta.total_items > 0 && (
        <section className="card">
          <div className="flex items-center gap-2 mb-2">
            <Download size={14} className="text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">Export Feed</span>
          </div>
          <div className="flex gap-2">
            <a href={`/api/transcript-study/export?${exportQuery}&format=pdf`} className="btn btn-secondary flex-1">PDF</a>
            <a href={`/api/transcript-study/export?${exportQuery}&format=docx`} className="btn btn-secondary flex-1">DOCX</a>
          </div>
        </section>
      )}

      {filterLoading ? (
        <FilterSkeleton />
      ) : items.length === 0 ? (
        <div className="card text-sm text-[var(--text-secondary)]">No transcript references match these filters.</div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
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
                    <p
                      className="text-sm leading-relaxed text-[var(--text-secondary)] [&_mark]:bg-[var(--accent)]/20 [&_mark]:text-[var(--accent)] [&_mark]:px-0.5 [&_mark]:rounded"
                      dangerouslySetInnerHTML={{ __html: highlightReference(occurrence.paragraph, occurrence.matched_reference) }}
                    />
                    <div className="text-[11px] font-medium text-[var(--accent)]">
                      Matched Reference: {occurrence.matched_reference}
                    </div>
                    <div className="rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-2.5">
                      <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)] mb-1">How It Was Used</div>
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

          {appendLoading && <div className="card animate-pulse h-24" />}
          {hasMore && <div ref={sentinelRef} className="h-1" />}
          <div ref={bottomRef} />
        </div>
      )}

      {items.length > 2 && !filterLoading && (
        <button
          type="button"
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })}
          className="fixed right-4 bottom-28 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-medium)] bg-[var(--surface)] text-[var(--accent)] shadow-lg hover:bg-[var(--surface-hover)]"
          aria-label="Jump to bottom of results"
          title="Jump to bottom"
        >
          <ChevronDown size={18} />
        </button>
      )}
    </section>
  );
}
