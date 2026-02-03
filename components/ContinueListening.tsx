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
  position: number;
  duration: number;
  progress: number;
  lastPlayed: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function ContinueListening({ allSermons }: { allSermons: SermonData[] }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ListeningEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      let items: ListeningEntry[] = [];

      if (user) {
        try {
          const res = await fetch('/api/listening/sync');
          if (res.ok) {
            const data = await res.json();
            items = (data.history || [])
              .map((h: any) => {
                const sermon = allSermons.find(s => s.sermon_code === h.sermon_code);
                if (!sermon) return null;
                const dur = h.duration || sermon.duration || 0;
                const progress = dur > 0 ? Math.min(100, (h.position / dur) * 100) : 0;
                const lastPlayed = h.updated_at ? new Date(h.updated_at).getTime() : 0;
                return { sermon, position: h.position, duration: dur, progress, lastPlayed };
              })
              .filter(Boolean) as ListeningEntry[];
          }
        } catch {}
      }

      if (items.length === 0) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('sermon-') && key.endsWith('-position')) {
            const code = key.replace('sermon-', '').replace('-position', '');
            const position = parseFloat(localStorage.getItem(key) || '0');
            if (position > 0) {
              const sermon = allSermons.find(s => s.sermon_code === code);
              if (sermon) {
                const duration = sermon.duration || 0;
                const progress = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
                const lastPlayedStr = localStorage.getItem(`sermon-${code}-lastPlayed`);
                const lastPlayed = lastPlayedStr ? parseInt(lastPlayedStr, 10) : 0;
                items.push({ sermon, position, duration, progress, lastPlayed });
              }
            }
          }
        }
      }

      // Only in-progress (< 95%), sorted by most recently played
      const inProg = items.filter(e => e.progress < 95).sort((a, b) => b.lastPlayed - a.lastPlayed);
      setEntries(inProg);
      setLoaded(true);
    }
    load();
  }, [allSermons, user]);

  if (!loaded) {
    return <div className="flex justify-center py-8"><div className="spinner" /></div>;
  }

  if (entries.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <h2 className="font-serif text-base font-semibold text-[var(--text-primary)]">
        Continue Listening
      </h2>
      <div className="space-y-2.5">
        {entries.map((entry) => (
          <Link key={entry.sermon.id} href={`/sermons/${entry.sermon.sermon_code}`} className="block">
            <div className="card-elevated group hover:border-[var(--accent)]/30 transition-all">
              <div className="flex items-center gap-3 mb-2.5">
                <PlayButton sermon={entry.sermon} size="sm" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-sm font-medium text-[var(--text-primary)] line-clamp-2 mb-0.5 group-hover:text-[var(--accent)] transition-colors">
                    {entry.sermon.title}
                  </h3>
                  {entry.sermon.date_preached && (
                    <div className="text-[11px] text-[var(--text-secondary)]">
                      {new Date(entry.sermon.date_preached).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </div>
                  )}
                </div>
              </div>
              <Waveform progress={entry.progress} bars={40} className="mb-1.5 h-8" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)] font-mono text-[11px]">
                  {formatTime(entry.position)} / {entry.duration > 0 ? formatTime(entry.duration) : '--:--'}
                </span>
                <span className="text-[var(--accent)] font-semibold text-[11px]">
                  {Math.round(entry.progress)}% complete
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
