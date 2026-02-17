export default function TranscriptStudyLoading() {
  return (
    <div className="pb-40 animate-fade-in">
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-30 border-b border-white/5">
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">Transcript</h1>
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
          Transcript Study
        </p>
      </header>

      <main className="px-4 py-4 space-y-4">
        <div className="card-elevated space-y-3">
          <div className="h-4 w-36 bg-[var(--bg-elevated)] rounded animate-pulse" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-11 bg-[var(--bg-elevated)] rounded-xl animate-pulse" />
            <div className="h-11 bg-[var(--bg-elevated)] rounded-xl animate-pulse" />
            <div className="h-11 bg-[var(--bg-elevated)] rounded-xl animate-pulse" />
          </div>
          <div className="h-11 bg-[var(--bg-elevated)] rounded-full animate-pulse" />
        </div>

        <div className="card animate-pulse h-20" />

        {[1, 2, 3].map((item) => (
          <div key={item} className="card-elevated space-y-3">
            <div className="h-5 w-2/3 bg-[var(--bg-elevated)] rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-[var(--bg-elevated)] rounded animate-pulse" />
            <div className="h-24 bg-[var(--bg-elevated)] rounded-xl animate-pulse" />
            <div className="h-20 bg-[var(--bg-elevated)] rounded-xl animate-pulse" />
          </div>
        ))}
      </main>
    </div>
  );
}
