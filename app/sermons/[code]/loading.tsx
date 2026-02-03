export default function SermonDetailLoading() {
  return (
    <div className="pb-40 animate-fade-in">
      <header className="px-6 pt-6 pb-4 glass sticky top-0 z-40 border-b border-white/5">
        <div className="h-4 w-12 bg-[var(--bg-elevated)] rounded animate-pulse mb-3" />
        <div className="h-7 w-3/4 bg-[var(--bg-elevated)] rounded animate-pulse" />
        <div className="h-4 w-1/3 bg-[var(--bg-elevated)] rounded animate-pulse mt-2" />
        <div className="flex gap-3 mt-3">
          <div className="h-4 w-28 bg-[var(--bg-elevated)] rounded animate-pulse" />
          <div className="h-4 w-16 bg-[var(--bg-elevated)] rounded animate-pulse" />
        </div>
      </header>
      <main className="px-6 py-6 space-y-6">
        {/* Audio player skeleton */}
        <div className="card-elevated animate-pulse">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-primary)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-[var(--bg-primary)] rounded" />
              <div className="h-3 w-16 bg-[var(--bg-primary)] rounded" />
            </div>
          </div>
          <div className="h-10 bg-[var(--bg-primary)] rounded" />
        </div>
        {/* Tabs skeleton */}
        <div className="flex gap-2">
          {['Overview', 'Study Notes', 'Transcript'].map((t) => (
            <div key={t} className="h-9 w-24 bg-[var(--bg-elevated)] rounded-lg animate-pulse" />
          ))}
        </div>
        {/* Content skeleton */}
        <div className="space-y-4">
          <div className="card-elevated animate-pulse space-y-3">
            <div className="h-5 w-32 bg-[var(--bg-primary)] rounded" />
            <div className="h-3 w-full bg-[var(--bg-primary)] rounded" />
            <div className="h-3 w-5/6 bg-[var(--bg-primary)] rounded" />
            <div className="h-3 w-4/6 bg-[var(--bg-primary)] rounded" />
          </div>
        </div>
      </main>
    </div>
  );
}
