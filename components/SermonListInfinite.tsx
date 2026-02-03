'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';
import Link from 'next/link';
import PlayButton from './PlayButton';
import AddToQueueButton from './AddToQueueButton';
import { SkeletonGrid } from './SkeletonCard';

interface LightSermon {
  id: number;
  sermon_code: string;
  title: string;
  date_preached?: string;
  audio_url?: string;
  verse?: string;
  transcript_text?: string;
  summary?: string;
}

interface SermonListInfiniteProps {
  children: ReactNode;
  hasMore: boolean;
  nextOffset: number;
  fetchUrl: string;
}

export default function SermonListInfinite({
  children,
  hasMore: initialHasMore,
  nextOffset: initialOffset,
  fetchUrl,
}: SermonListInfiniteProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [extraItems, setExtraItems] = useState<LightSermon[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(initialOffset);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current && hasMore) {
          loadMore();
        }
      },
      { rootMargin: '400px' }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);

    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
  }, [hasMore, nextOffset]);

  const loadMore = async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const separator = fetchUrl.includes('?') ? '&' : '?';
      const res = await fetch(`${fetchUrl}${separator}offset=${nextOffset}`);
      if (res.ok) {
        const data = await res.json();
        setExtraItems(prev => [...prev, ...(data.items || [])]);
        setNextOffset(data.nextOffset ?? nextOffset + (data.items?.length || 0));
        setHasMore(data.hasMore ?? false);
      }
    } catch {}
    finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  return (
    <>
      {children}
      {extraItems.map((sermon) => (
        <div key={sermon.id} className="card group relative">
          <Link href={`/sermons/${sermon.sermon_code}`} className="block">
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
                  {sermon.date_preached && (
                    <span>
                      {new Date(sermon.date_preached).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
                {sermon.summary && (
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                    {sermon.summary}
                  </p>
                )}
              </div>
            </div>
          </Link>
          <div className="absolute top-2 right-2">
            <AddToQueueButton sermon={sermon} variant="icon" />
          </div>
        </div>
      ))}
      {loading && <SkeletonGrid count={4} />}
      {hasMore && <div ref={sentinelRef} className="h-1" />}
    </>
  );
}
