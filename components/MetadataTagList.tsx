import Link from 'next/link';

interface MetadataTagListProps {
  items: { value: string; sermon_count: number }[];
  /** Base path for individual tag links (value will be URI-encoded and appended) */
  basePath: string;
  /** Max items to show before "View All" (undefined = show all) */
  limit?: number;
  /** Link for "View All" button */
  viewAllHref?: string;
  /** Show sermon count in each tag */
  showCount?: boolean;
}

export default function MetadataTagList({
  items,
  basePath,
  limit,
  viewAllHref,
  showCount = true,
}: MetadataTagListProps) {
  const displayItems = limit ? items.slice(0, limit) : items;
  const hasMore = limit ? items.length > limit : false;

  if (displayItems.length === 0) {
    return (
      <p className="text-sm text-[var(--text-tertiary)] italic">
        No items found
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {displayItems.map((item) => (
          <Link
            key={item.value}
            href={`${basePath}/${encodeURIComponent(item.value)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
              bg-[var(--surface)] border border-[var(--border-subtle)]
              text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40
              transition-all"
          >
            <span>{item.value}</span>
            {showCount && (
              <span className="text-[var(--text-quaternary)]">
                {item.sermon_count}
              </span>
            )}
          </Link>
        ))}
      </div>
      {(hasMore || viewAllHref) && viewAllHref && (
        <Link
          href={viewAllHref}
          className="inline-block mt-3 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
        >
          View All →
        </Link>
      )}
    </div>
  );
}
