'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PlayButton from './PlayButton';
import Waveform from './Waveform';
import { useAuth } from '@/context/AuthContext';

interface SermonData {
  id?: number;
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

interface SyncHistoryApiEntry {
  sermon_code: string;
  position: number;
  duration?: number;
  last_played_at?: string;
}

interface HistoryApiItem {
  sermon_code: string;
  title: string;
  audio_url?: string | null;
  date_preached?: string | null;
  position: number;
  duration: number;
  progress_percent: number;
  is_completed: boolean;
  last_played_at: string;
}

interface HistoryApiResponse {
  items?: HistoryApiItem[];
}

interface QueueSnapshot {
  items?: Array<{
    sermonCode?: string;
    title?: string;
    audioUrl?: string;
  }>;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function parseQueueSnapshot(): Map<string, { title?: string; audio_url?: string }> {
  try {
    const raw = localStorage.getItem('gty-listening-queue');
    if (!raw) return new Map();

    const parsed = JSON.parse(raw) as QueueSnapshot;
    const map = new Map<string, { title?: string; audio_url?: string }>();

    for (const item of parsed.items || []) {
      if (!item.sermonCode) continue;
      map.set(item.sermonCode, {
        title: item.title,
        audio_url: item.audioUrl,
      });
    }

    return map;
  } catch (err) {
    console.error('[GTY] Failed to parse queue snapshot from localStorage:', err);
    return new Map();
  }
}

export default function ContinueListening({ allSermons = [] }: { allSermons?: SermonData[] }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ListeningEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      let items: ListeningEntry[] = [];

      if (user) {
        try {
          const historyRes = await fetch('/api/listening/history?range=all&limit=30&offset=0', {
            cache: 'no-store',
          });

          if (historyRes.ok) {
            const data = (await historyRes.json()) as HistoryApiResponse;
            items = (data.items || [])
              .filter((item) => !item.is_completed && item.progress_percent < 90)
              .map((item) => ({
                sermon: {
                  sermon_code: item.sermon_code,
                  title: item.title || item.sermon_code,
                  audio_url: item.audio_url || undefined,
                  date_preached: item.date_preached || undefined,
                  duration: item.duration || 0,
                },
                position: item.position || 0,
                duration: item.duration || 0,
                progress: item.progress_percent || 0,
                lastPlayed: item.last_played_at ? new Date(item.last_played_at).getTime() : 0,
              }));
          }

          // Backward-compatible fallback if history endpoint is unavailable.
          if (items.length === 0) {
            const res = await fetch('/api/listening/sync');
            if (res.ok) {
              const data = await res.json();
              items = (data.history || [])
                .map((h: SyncHistoryApiEntry) => {
                  const sermon = allSermons.find((s) => s.sermon_code === h.sermon_code);
                  if (!sermon) return null;
                  const dur = h.duration || sermon.duration || 0;
                  const progress = dur > 0 ? Math.min(100, (h.position / dur) * 100) : 0;
                  const lastPlayed = h.last_played_at ? new Date(h.last_played_at).getTime() : 0;
                  return { sermon, position: h.position, duration: dur, progress, lastPlayed };
                })
                .filter(Boolean) as ListeningEntry[];
            }
          }
        } catch (err) {
          console.error('[GTY] Failed to load listening history from server:', err);
          // Fall through to local fallback.
        }
      }

      if (items.length === 0) {
        const queueMap = parseQueueSnapshot();

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key?.startsWith('sermon-') || !key.endsWith('-position')) continue;

          const code = key.replace('sermon-', '').replace('-position', '');
          const position = parseFloat(localStorage.getItem(key) || '0');
          if (position <= 0) continue;

          const sermonFromList = allSermons.find((s) => s.sermon_code === code);
          const sermonFromQueue = queueMap.get(code);
          const duration = sermonFromList?.duration || 0;
          const progress = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
          const lastPlayedStr = localStorage.getItem(`sermon-${code}-lastPlayed`);
          const lastPlayed = lastPlayedStr ? parseInt(lastPlayedStr, 10) : 0;

          items.push({
            sermon: {
              id: sermonFromList?.id,
              sermon_code: code,
              title: sermonFromList?.title || sermonFromQueue?.title || code,
              date_preached: sermonFromList?.date_preached,
              duration,
              audio_url: sermonFromList?.audio_url || sermonFromQueue?.audio_url,
            },
            position,
            duration,
            progress,
            lastPlayed,
          });
        }
      }

      const mostRecentInProgress = items
        .filter((entry) => entry.progress < 90)
        .sort((a, b) => b.lastPlayed - a.lastPlayed)
        .slice(0, 1);

      setEntries(mostRecentInProgress);
      setLoaded(true);
    }

    load();
  }, [allSermons, user]);

  if (!loaded) {
    return <div className="flex justify-center py-8"><div className="spinner" /></div>;
  }

  if (entries.length === 0) return null;

  const entry = entries[0];

  return (
    <div className="space-y-2.5">
      <h2 className="font-serif text-base font-semibold text-[var(--text-primary)]">
        Continue Listening
      </h2>
      <div className="card-elevated group hover:border-[var(--accent)]/30 transition-all">
        <div className="flex items-start gap-3">
          <PlayButton sermon={entry.sermon} size="sm" />
          <Link href={`/sermons/${entry.sermon.sermon_code}`} className="flex-1 min-w-0">
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
                {formatTime(entry.position)} / {entry.duration > 0 ? formatTime(entry.duration) : '--:--'}
              </span>
              <span className="text-[var(--accent)] font-semibold text-[11px]">
                {Math.round(entry.progress)}% complete
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
