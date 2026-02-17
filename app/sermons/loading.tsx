import { SkeletonGrid } from '@/components/SkeletonCard';

export default function SermonsLoading() {
  return (
    <div className="pb-40 animate-fade-in">
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-30 border-b border-white/5">
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">All Sermons</h1>
        <div className="h-3 w-24 bg-[var(--bg-elevated)] rounded animate-pulse mt-1" />
      </header>
      <main className="px-4 py-4 space-y-4">
        <SkeletonGrid count={10} />
      </main>
    </div>
  );
}
