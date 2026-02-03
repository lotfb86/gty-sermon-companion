'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';
import { SkeletonGrid } from './SkeletonCard';

interface InfiniteScrollProps {
  /** Initial items rendered by the server */
  children: ReactNode;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Current offset for next fetch */
  nextOffset: number;
  /** URL to fetch more items from (will append ?offset=N) */
  fetchUrl: string;
  /** Render function for each item fetched client-side */
  renderItem: (item: any) => ReactNode;
  /** Number of skeleton cards to show while loading */
  skeletonCount?: number;
}

export default function InfiniteScroll({
  children,
  hasMore: initialHasMore,
  nextOffset: initialOffset,
  fetchUrl,
  renderItem,
  skeletonCount = 4,
}: InfiniteScrollProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [extraItems, setExtraItems] = useState<any[]>([]);
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
        const items = data.items || [];
        const more = data.hasMore ?? false;

        setExtraItems(prev => [...prev, ...items]);
        setNextOffset(data.nextOffset ?? nextOffset + items.length);
        setHasMore(more);
      }
    } catch {
      // silently fail, user can scroll down again
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  return (
    <>
      {children}
      {extraItems.map((item, idx) => (
        <div key={`infinite-${idx}`}>{renderItem(item)}</div>
      ))}
      {loading && <SkeletonGrid count={skeletonCount} />}
      {hasMore && <div ref={sentinelRef} className="h-1" />}
    </>
  );
}
