'use client';

import { useAudio } from '@/context/AudioContext';
import NowPlaying from '@/components/listening/NowPlaying';
import QueueList from '@/components/listening/QueueList';
import EmptyQueueState from '@/components/listening/EmptyQueueState';

export default function ListeningPage() {
  const { currentSermon, queue } = useAudio();

  const hasContent = currentSermon || queue.length > 0;

  return (
    <div className="pb-40 animate-fade-in">
      {/* Header */}
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-30 border-b border-white/5">
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">Listening</h1>
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
          {hasContent ? 'Now Playing & Queue' : 'Your Listening Path'}
        </p>
      </header>

      <main className="px-4 py-4 space-y-5">
        {hasContent ? (
          <>
            {/* Now Playing */}
            {currentSermon && <NowPlaying />}

            {/* Up Next Queue */}
            <QueueList />

            {/* Show a prompt if queue is empty but something is playing */}
            {currentSermon && queue.length <= 1 && (
              <div className="text-center py-6">
                <p className="text-xs text-[var(--text-tertiary)] mb-3">
                  Queue is empty. Add more sermons to keep listening.
                </p>
                <a
                  href="/browse/scripture"
                  className="text-xs text-[var(--accent)] font-medium hover:underline"
                >
                  Browse Sermons →
                </a>
              </div>
            )}
          </>
        ) : (
          <EmptyQueueState />
        )}
      </main>
    </div>
  );
}
