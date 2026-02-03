export default function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center gap-4">
        {/* Play button skeleton */}
        <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] shrink-0" />

        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          <div className="h-4 bg-[var(--bg-elevated)] rounded w-3/4" />

          {/* Verse */}
          {lines >= 2 && <div className="h-3 bg-[var(--bg-elevated)] rounded w-1/3" />}

          {/* Date / meta */}
          {lines >= 3 && (
            <div className="flex gap-2">
              <div className="h-3 bg-[var(--bg-elevated)] rounded w-20" />
              <div className="h-3 bg-[var(--bg-elevated)] rounded w-16" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6, lines = 3 }: { count?: number; lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  );
}
