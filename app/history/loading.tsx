export default function HistoryLoading() {
  return (
    <div className="pb-32 animate-fade-in">
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-30 border-b border-white/5">
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">History</h1>
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
          Your Learning Journey
        </p>
      </header>

      <main className="px-4 py-4 space-y-5">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-24 rounded-full bg-[var(--bg-elevated)] animate-pulse" />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-elevated animate-pulse h-20" />
          ))}
        </div>

        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card-elevated animate-pulse h-24" />
          ))}
        </div>
      </main>
    </div>
  );
}
