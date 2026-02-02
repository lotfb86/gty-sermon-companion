import { getAllSermons } from '@/lib/db';
import HistoryContent from './HistoryContent';

export default async function HistoryPage() {
  const allSermons = await getAllSermons(500, 0);

  return (
    <div className="pb-32 animate-fade-in">
      {/* Header */}
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-40 border-b border-white/5">
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">History</h1>
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
          Your Learning Journey
        </p>
      </header>

      <main className="px-4 py-4 space-y-5">
        <HistoryContent allSermons={allSermons} />
      </main>
    </div>
  );
}
