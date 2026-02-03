import { SkeletonGrid } from '@/components/SkeletonCard';

export default function SearchLoading() {
  return (
    <div className="pb-32 animate-fade-in">
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-40 border-b border-white/5">
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">Search</h1>
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
          Find Sermons
        </p>
      </header>
      <main className="px-4 py-4 space-y-4">
        {/* Search bar skeleton */}
        <div className="h-12 bg-[var(--bg-elevated)] rounded-xl animate-pulse" />
        {/* Mode selector skeleton */}
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-16 bg-[var(--bg-elevated)] rounded-full animate-pulse" />
          ))}
        </div>
        <SkeletonGrid count={8} />
      </main>
    </div>
  );
}
