export default function BookLoading() {
  return (
    <div className="pb-32 animate-fade-in">
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-30 border-b border-white/5">
        <div className="h-3 w-24 bg-[var(--bg-elevated)] rounded animate-pulse mb-2" />
        <div className="h-6 w-32 bg-[var(--bg-elevated)] rounded animate-pulse" />
      </header>
      <main className="px-4 py-4 space-y-5">
        {/* Chapters grid skeleton */}
        <section>
          <div className="h-5 w-20 bg-[var(--bg-elevated)] rounded animate-pulse mb-4" />
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="card text-center py-3 animate-pulse">
                <div className="h-5 w-6 mx-auto bg-[var(--bg-elevated)] rounded" />
                <div className="h-3 w-4 mx-auto bg-[var(--bg-elevated)] rounded mt-1" />
              </div>
            ))}
          </div>
        </section>
        {/* Recent sermons skeleton */}
        <section>
          <div className="h-5 w-32 bg-[var(--bg-elevated)] rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="flex gap-3">
                  <div className="w-12 h-16 bg-[var(--bg-elevated)] rounded shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-[var(--bg-elevated)] rounded" />
                    <div className="h-3 w-1/3 bg-[var(--bg-elevated)] rounded" />
                    <div className="h-3 w-1/4 bg-[var(--bg-elevated)] rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
