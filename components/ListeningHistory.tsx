'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PlayButton from './PlayButton';
import Waveform from './Waveform';
import { useAuth } from '@/context/AuthContext';

interface SermonData {
  id: number;
  sermon_code: string;
  title: string;
  date_preached?: string;
  duration?: number;
  audio_url?: string;
}

interface ListeningEntry {
  sermon: SermonData;
  position: number;  // seconds
  duration: number;  // seconds
  progress: number;  // 0-100
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function ListeningHistory({ allSermons }: { allSermons: SermonData[] }) {
  const { user } = useAuth();
  const [inProgress, setInProgress] = useState<ListeningEntry[]>([]);
  const [completed, setCompleted] = useState<ListeningEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      let entries: ListeningEntry[] = [];

      if (user) {
        // Fetch from server when logged in
        try {
          const res = await fetch('/api/listening/sync');
          if (res.ok) {
            const data = await res.json();
            entries = (data.history || []).map((h: any) => {
              const sermon = allSermons.find(s => s.sermon_code === h.sermon_code);
              if (!sermon) return null;
              const dur = h.duration || sermon.duration || 0;
              const progress = dur > 0 ? Math.min(100, (h.position / dur) * 100) : 0;
              return { sermon, position: h.position, duration: dur, progress };
            }).filter(Boolean) as ListeningEntry[];
          }
        } catch (err) {
          console.error('[GTY] Failed to load listening history from server:', err);
          // Fall back to localStorage on server error
        }
      }

      // If no server entries (not logged in or server error), use localStorage
      if (entries.length === 0) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sermon-') && key.endsWith('-position')) {
            const code = key.replace('sermon-', '').replace('-position', '');
            const position = parseFloat(localStorage.getItem(key) || '0');

            if (position > 0) {
              const sermon = allSermons.find(s => s.sermon_code === code);
              if (sermon) {
                const duration = sermon.duration || 0;
                const progress = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
                entries.push({ sermon, position, duration, progress });
              }
            }
          }
        }
      }

      // Split into in-progress (< 95%) and completed (>= 95%)
      const inProg: ListeningEntry[] = [];
      const comp: ListeningEntry[] = [];

      for (const entry of entries) {
        if (entry.progress >= 95) {
          comp.push(entry);
        } else {
          inProg.push(entry);
        }
      }

      // Sort by most recently listened
      inProg.sort((a, b) => b.position - a.position);
      comp.sort((a, b) => b.position - a.position);

      setInProgress(inProg);
      setCompleted(comp);
      setLoaded(true);
    }

    loadHistory();
  }, [allSermons, user]);

  if (!loaded) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner" />
      </div>
    );
  }

  const hasHistory = inProgress.length > 0 || completed.length > 0;

  return (
    <div className="space-y-5">
      {/* Continue Listening */}
      {inProgress.length > 0 && (
        <div className="space-y-2.5">
          <h2 className="font-serif text-base font-semibold text-[var(--text-primary)]">
            Continue Listening
          </h2>

          <div className="space-y-2.5">
            {inProgress.map((entry) => (
              <div key={entry.sermon.id} className="card-elevated group hover:border-[var(--accent)]/30 transition-all">
                <div className="flex items-start gap-3">
                  <PlayButton sermon={entry.sermon} size="sm" />
                  <Link
                    href={`/sermons/${entry.sermon.sermon_code}`}
                    className="flex-1 min-w-0"
                  >
                    <div className="mb-2.5">
                      <h3 className="font-serif text-sm font-medium text-[var(--text-primary)] line-clamp-2 mb-0.5 group-hover:text-[var(--accent)] transition-colors">
                        {entry.sermon.title}
                      </h3>
                      {entry.sermon.date_preached && (
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          {new Date(entry.sermon.date_preached).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      )}
                    </div>

                    <Waveform progress={entry.progress} bars={40} className="mb-1.5 h-8" />

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-secondary)] font-mono text-[11px]">
                        {formatTime(entry.position)} / {entry.duration > 0 ? formatDuration(entry.duration) : '--:--'}
                      </span>
                      <span className="text-[var(--accent)] font-semibold text-[11px]">
                        {Math.round(entry.progress)}% complete
                      </span>
                    </div>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Completed */}
      {completed.length > 0 && (
        <div className="space-y-2.5">
          <h2 className="font-serif text-base font-semibold text-[var(--text-primary)]">
            Recently Completed
          </h2>

          <div className="space-y-2">
            {completed.map((entry) => (
              <div key={entry.sermon.id} className="card group">
                <div className="flex items-center gap-3">
                  <PlayButton sermon={entry.sermon} size="sm" />
                  <Link href={`/sermons/${entry.sermon.sermon_code}`} className="flex-1 min-w-0">
                    <h3 className="font-serif text-sm font-medium text-[var(--text-primary)] line-clamp-2 mb-0.5 group-hover:text-[var(--accent)] transition-colors">
                      {entry.sermon.title}
                    </h3>
                    <div className="text-[11px] text-[var(--text-secondary)]">
                      Completed
                    </div>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasHistory && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🎧</div>
          <h3 className="font-serif text-base font-bold text-[var(--text-primary)] mb-2">
            No Listening History
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4 max-w-[260px] mx-auto">
            Start listening to sermons and your progress will appear here automatically.
          </p>
          <Link href="/browse/scripture" className="btn btn-primary text-sm">
            Browse Sermons
          </Link>
        </div>
      )}
    </div>
  );
}
