'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PlayButton from './PlayButton';
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

interface HistoryApiEntry {
  sermon_code: string;
  position: number;
  duration?: number;
  last_played_at?: string;
}

export default function RecentlyCompleted({ allSermons }: { allSermons: SermonData[] }) {
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
              .map((h: HistoryApiEntry) => {
                const sermon = allSermons.find(s => s.sermon_code === h.sermon_code);
                if (!sermon) return null;
                const dur = h.duration || sermon.duration || 0;
                const progress = dur > 0 ? Math.min(100, (h.position / dur) * 100) : 0;
                const lastPlayed = h.last_played_at ? new Date(h.last_played_at).getTime() : 0;
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

      // Only completed (>= 90%)
      const comp = items.filter(e => e.progress >= 90).sort((a, b) => b.lastPlayed - a.lastPlayed);
      setEntries(comp);
      setLoaded(true);
    }
    load();
  }, [allSermons, user]);

  if (!loaded || entries.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <h2 className="font-serif text-base font-semibold text-[var(--text-primary)]">
        Recently Completed
      </h2>
      <div className="space-y-2">
        {entries.map((entry) => (
          <Link key={entry.sermon.id} href={`/sermons/${entry.sermon.sermon_code}`} className="card group">
            <div className="flex items-center gap-3">
              <PlayButton sermon={entry.sermon} size="sm" />
              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-sm font-medium text-[var(--text-primary)] line-clamp-2 mb-0.5 group-hover:text-[var(--accent)] transition-colors">
                  {entry.sermon.title}
                </h3>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Completed
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
