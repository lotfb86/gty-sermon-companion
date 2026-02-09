import { SkeletonGrid } from '@/components/SkeletonCard';

export default function ChapterLoading() {
  return (
    <div className="pb-32 animate-fade-in">
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-30 border-b border-white/5">
        <div className="h-3 w-28 bg-[var(--bg-elevated)] rounded animate-pulse mb-2" />
        <div className="h-6 w-36 bg-[var(--bg-elevated)] rounded animate-pulse" />
        <div className="h-3 w-20 bg-[var(--bg-elevated)] rounded animate-pulse mt-1" />
      </header>
      <main className="px-4 py-4 space-y-6">
        <SkeletonGrid count={6} />
      </main>
    </div>
  );
}
