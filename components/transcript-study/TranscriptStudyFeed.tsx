'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type { TranscriptStudyFacet, TranscriptStudySearchResult, TranscriptStudySermonGroup } from '@/lib/db';

interface TranscriptStudyFeedProps {
  initialResult: TranscriptStudySearchResult;
  book: string;
  chapter: number;
  verse: number;
  year?: number;
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

function buildHref(options: {
  book: string;
  chapter: number;
  verse: number;
  year?: number;
  doctrines?: string[];
}): string {
  const params = new URLSearchParams();
  params.set('book', options.book);
  params.set('chapter', String(options.chapter));
  params.set('verse', String(options.verse));
  if (options.year) params.set('year', String(options.year));
  for (const doctrine of options.doctrines || []) {
    params.append('doctrine', doctrine);
  }
  return `/transcript-study?${params.toString()}`;
}

function toggleDoctrine(selected: string[], doctrine: string): string[] {
  if (selected.includes(doctrine)) {
    return selected.filter((item) => item !== doctrine);
  }
  return [...selected, doctrine];
}

function mergeBySermonCode(existing: TranscriptStudySermonGroup[], incoming: TranscriptStudySermonGroup[]): TranscriptStudySermonGroup[] {
  const map = new Map<string, TranscriptStudySermonGroup>();
  for (const item of existing) {
    map.set(item.sermon_code, item);
  }
  for (const item of incoming) {
    if (!map.has(item.sermon_code)) {
      map.set(item.sermon_code, item);
    }
  }
  return [...map.values()];
}

export default function TranscriptStudyFeed({
  initialResult,
  book,
  chapter,
  verse,
  year,
  selectedDoctrines,
  pageSize = 6,
}: TranscriptStudyFeedProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [items, setItems] = useState<TranscriptStudySermonGroup[]>(initialResult.items);
  const [hasMore, setHasMore] = useState(initialResult.has_more);
  const [nextOffset, setNextOffset] = useState(initialResult.items.length);
  const [loading, setLoading] = useState(false);
  const [showAllDoctrines, setShowAllDoctrines] = useState(false);

  useEffect(() => {
    setItems(initialResult.items);
    setHasMore(initialResult.has_more);
    setNextOffset(initialResult.items.length);
    setLoading(false);
  }, [initialResult]);

  const sortedDoctrines = useMemo(
    () => [...initialResult.doctrine_facets].sort((a, b) => a.value.localeCompare(b.value)),
    [initialResult.doctrine_facets]
  );
  const visibleDoctrines = showAllDoctrines ? sortedDoctrines : sortedDoctrines.slice(0, 5);

  const fetchMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('book', book);
      params.set('chapter', String(chapter));
      params.set('verse', String(verse));
      params.set('offset', String(nextOffset));
      params.set('limit', String(pageSize));
      if (year) params.set('year', String(year));
      for (const doctrine of selectedDoctrines) {
        params.append('doctrine', doctrine);
      }

      const response = await fetch(`/api/transcript-study/search?${params.toString()}`);
      if (!response.ok) return;

      const data = (await response.json()) as TranscriptStudySearchResult;
      setItems((prev) => mergeBySermonCode(prev, data.items || []));
      setHasMore(Boolean(data.has_more));
      setNextOffset((prev) => prev + (data.items?.length || 0));
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, book, chapter, verse, nextOffset, pageSize, year, selectedDoctrines]);

  useEffect(() => {
    if (!hasMore) return;
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
  }, [hasMore, fetchMore]);

  const selectedReference = `${book} ${chapter}:${verse}`;
  const hasDoctrineFilter = sortedDoctrines.length > 0;

  return (
    <section className="space-y-4">
      <div className="card-elevated">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-1">Bill Search Reference</div>
        <div className="text-lg font-serif font-semibold text-[var(--gold-text)]">{selectedReference}</div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold text-[var(--accent)] leading-none">{initialResult.total_items}</div>
            <div className="text-xs text-[var(--text-secondary)]">sermons with matching transcript context</div>
          </div>
          {year && (
            <div className="text-xs text-[var(--text-secondary)]">
              Year filter: <span className="text-[var(--accent)]">{year}</span>
            </div>
          )}
        </div>
      </div>

      {hasDoctrineFilter && (
        <div className="card p-3 space-y-2">
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-[0.15em]">
            Doctrine Filter
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildHref({ book, chapter, verse, year, doctrines: [] })}
              className={`tag ${selectedDoctrines.length === 0 ? 'tag-active' : ''}`}
            >
              All Doctrines
            </Link>
            {visibleDoctrines.map((facet: TranscriptStudyFacet) => {
              const active = selectedDoctrines.includes(facet.value);
              const nextDoctrines = toggleDoctrine(selectedDoctrines, facet.value);
              return (
                <Link
                  key={facet.value}
                  href={buildHref({ book, chapter, verse, year, doctrines: nextDoctrines })}
                  className={`tag ${active ? 'tag-active' : ''}`}
                >
                  {facet.value} ({facet.count})
                </Link>
              );
            })}
          </div>
          {sortedDoctrines.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllDoctrines((prev) => !prev)}
              className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              {showAllDoctrines ? 'Show Top 5' : `Show All (${sortedDoctrines.length})`}
            </button>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="card text-sm text-[var(--text-secondary)]">
          No transcript references match these filters.
        </div>
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

          {loading && (
            <div className="card animate-pulse h-24" />
          )}

          {hasMore && <div ref={sentinelRef} className="h-1" />}
          <div ref={bottomRef} />
        </div>
      )}

      {items.length > 2 && (
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
