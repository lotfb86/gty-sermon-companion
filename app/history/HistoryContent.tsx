'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Clock, BookOpen, Flame } from 'lucide-react';
import ContinueListening from '@/components/ContinueListening';
import RecentlyCompleted from '@/components/RecentlyCompleted';
import ListeningAuthBanner from '@/components/ListeningAuthBanner';
import Link from 'next/link';

interface SermonData {
  id: number;
  sermon_code: string;
  title: string;
  date_preached?: string;
  duration?: number;
  audio_url?: string;
}

interface Stats {
  hoursListened: number;
  sermonsCompleted: number;
  streak: number;
  totalSermons: number;
  topTopics: { name: string; count: number }[];
  topBooks: { name: string; count: number }[];
  topCategories: { name: string; count: number }[];
}

export default function HistoryContent({ allSermons }: { allSermons: SermonData[] }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    setStatsLoading(true);
    fetch('/api/listening/stats')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setStats(data);
        setStatsLoading(false);
      })
      .catch(() => setStatsLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="space-y-5">
        <ListeningAuthBanner />
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center">
            <Clock size={28} className="text-[var(--text-tertiary)]" />
          </div>
          <h3 className="font-serif text-lg font-bold text-[var(--text-primary)] mb-2">
            Sign In to Track Your Journey
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mb-6 max-w-[280px] mx-auto leading-relaxed">
            Create an account to track your listening history, see stats, and discover what you&apos;ve been learning.
          </p>
          <Link href="/login" className="btn btn-primary text-sm">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats Dashboard */}
      {statsLoading ? (
        <div className="grid grid-cols-3 gap-2.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="card-elevated animate-pulse h-20" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-3 gap-2.5">
          <div className="card-elevated text-center py-3">
            <Clock size={18} className="mx-auto mb-1.5 text-[var(--accent)]" />
            <div className="text-lg font-bold text-[var(--text-primary)]">
              {stats.hoursListened}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
              Hours
            </div>
          </div>
          <div className="card-elevated text-center py-3">
            <BookOpen size={18} className="mx-auto mb-1.5 text-[var(--accent)]" />
            <div className="text-lg font-bold text-[var(--text-primary)]">
              {stats.sermonsCompleted}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
              Completed
            </div>
          </div>
          <div className="card-elevated text-center py-3">
            <Flame size={18} className="mx-auto mb-1.5 text-[var(--accent)]" />
            <div className="text-lg font-bold text-[var(--text-primary)]">
              {stats.streak}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
              Day Streak
            </div>
          </div>
        </div>
      ) : null}

      {/* Learning Insights */}
      {stats && (stats.topTopics.length > 0 || stats.topBooks.length > 0 || stats.topCategories.length > 0) && (
        <div className="space-y-4">
          <h2 className="font-serif text-base font-semibold text-[var(--text-primary)]">
            Learning Insights
          </h2>

          {stats.topTopics.length > 0 && (
            <div>
              <h3 className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                Top Topics Studied
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {stats.topTopics.map(t => (
                  <span
                    key={t.name}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                  >
                    {t.name}
                    <span className="text-[var(--text-quaternary)] text-[10px]">{t.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {stats.topBooks.length > 0 && (
            <div>
              <h3 className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                Top Books Studied
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {stats.topBooks.map(b => (
                  <span
                    key={b.name}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)]"
                  >
                    {b.name}
                    <span className="text-[var(--accent)]/60 text-[10px]">{b.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {stats.topCategories.length > 0 && (
            <div>
              <h3 className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                Theological Focus
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {stats.topCategories.map(c => (
                  <span
                    key={c.name}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                  >
                    {c.name}
                    <span className="text-[var(--text-quaternary)] text-[10px]">{c.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Continue Listening */}
      <ContinueListening allSermons={allSermons} />

      {/* Recently Completed */}
      <RecentlyCompleted allSermons={allSermons} />

      {/* Empty state if no stats */}
      {stats && stats.totalSermons === 0 && (
        <div className="text-center py-8">
          <p className="text-xs text-[var(--text-tertiary)] mb-3">
            No listening history yet. Start listening to sermons and your journey will appear here.
          </p>
          <Link href="/browse/scripture" className="text-xs text-[var(--accent)] font-medium hover:underline">
            Browse Sermons →
          </Link>
        </div>
      )}
    </div>
  );
}
