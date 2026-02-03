'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Clock, Flame, Library } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ListeningAuthBanner from '@/components/ListeningAuthBanner';
import PlayButton from '@/components/PlayButton';

type RangeValue = '7d' | '30d' | '90d' | '180d' | '365d' | 'all';

interface StatsResponse {
  range: RangeValue;
  hoursListened: number;
  seriesCompleted: number;
  streak: number;
  sermonsListened: number;
  activeDays: number;
}

interface HistoryItem {
  sermon_code: string;
  title: string;
  audio_url?: string | null;
  date_preached?: string | null;
  series_name?: string | null;
  position: number;
  duration: number;
  last_played_at: string;
  completed_at?: string | null;
  progress_percent: number;
  is_completed: boolean;
  listen_dates: string[];
  listened_seconds: number;
}

interface HistoryResponse {
  range: RangeValue;
  items: HistoryItem[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

const RANGE_OPTIONS: { value: RangeValue; label: string }[] = [
  { value: '7d', label: 'Last Week' },
  { value: '30d', label: 'Last Month' },
  { value: '90d', label: 'Last 3 Months' },
  { value: '180d', label: 'Last 6 Months' },
  { value: '365d', label: 'Last Year' },
  { value: 'all', label: 'All Time' },
];

const PAGE_SIZE = 30;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);

  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  if (mins > 0) return `${mins}m`;
  return '<1m';
}

export default function HistoryContent() {
  const { user } = useAuth();

  const [selectedRange, setSelectedRange] = useState<RangeValue>('30d');
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [totalHistory, setTotalHistory] = useState(0);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  const initialHistoryLoading = historyLoading && history.length === 0;

  const fetchStats = useCallback(async (range: RangeValue) => {
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/listening/stats?range=${range}`, { cache: 'no-store' });
      if (!res.ok) {
        setStats(null);
        return;
      }
      const data = (await res.json()) as StatsResponse;
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (range: RangeValue, offset: number, append: boolean) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(
        `/api/listening/history?range=${range}&limit=${PAGE_SIZE}&offset=${offset}`,
        { cache: 'no-store' }
      );
      if (!res.ok) {
        if (!append) {
          setHistory([]);
          setHistoryOffset(0);
          setHasMoreHistory(false);
          setTotalHistory(0);
        }
        return;
      }

      const data = (await res.json()) as HistoryResponse;
      setHistory((prev) => (append ? [...prev, ...data.items] : data.items));
      setHistoryOffset(data.offset + data.items.length);
      setHasMoreHistory(data.hasMore);
      setTotalHistory(data.total);
    } catch {
      if (!append) {
        setHistory([]);
        setHistoryOffset(0);
        setHasMoreHistory(false);
        setTotalHistory(0);
      }
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    setExpandedDates({});
    void Promise.all([
      fetchStats(selectedRange),
      fetchHistory(selectedRange, 0, false),
    ]);
  }, [user, selectedRange, fetchStats, fetchHistory]);

  const summaryLabel = useMemo(() => {
    const selected = RANGE_OPTIONS.find((option) => option.value === selectedRange);
    return selected ? selected.label : 'Selected Range';
  }, [selectedRange]);

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
            Create an account to track your listening history and watch your progress grow over time.
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
      <section className="space-y-2.5">
        <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-[0.18em]">
          Time Range
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {RANGE_OPTIONS.map((option) => {
            const active = selectedRange === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedRange(option.value)}
                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-all ${
                  active
                    ? 'bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)]'
                    : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent)]/25'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      {statsLoading ? (
        <div className="grid grid-cols-3 gap-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-elevated animate-pulse h-20" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="card-elevated text-center py-3">
              <Clock size={18} className="mx-auto mb-1.5 text-[var(--accent)]" />
              <div className="text-lg font-bold text-[var(--text-primary)]">
                {stats?.hoursListened ?? 0}
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
                Hours Listened
              </div>
            </div>
            <div className="card-elevated text-center py-3">
              <Library size={18} className="mx-auto mb-1.5 text-[var(--accent)]" />
              <div className="text-lg font-bold text-[var(--text-primary)]">
                {stats?.seriesCompleted ?? 0}
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
                Series Completed
              </div>
            </div>
            <div className="card-elevated text-center py-3">
              <Flame size={18} className="mx-auto mb-1.5 text-[var(--accent)]" />
              <div className="text-lg font-bold text-[var(--text-primary)]">
                {stats?.streak ?? 0}
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
                Day Streak
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)]">
            {summaryLabel}: {stats?.sermonsListened ?? 0} sermons across {stats?.activeDays ?? 0} active days
          </p>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-base font-semibold text-[var(--text-primary)]">
            Listening History
          </h2>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            {totalHistory} total
          </span>
        </div>

        {initialHistoryLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card-elevated animate-pulse h-24" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 card-elevated">
            <p className="text-xs text-[var(--text-tertiary)] mb-3">
              No listening history in this range yet.
            </p>
            <Link href="/browse/scripture" className="text-xs text-[var(--accent)] font-medium hover:underline">
              Browse Sermons →
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.map((item) => {
              const isExpanded = expandedDates[item.sermon_code] === true;
              const visibleDates = isExpanded ? item.listen_dates : item.listen_dates.slice(0, 3);
              const hiddenCount = Math.max(0, item.listen_dates.length - visibleDates.length);

              return (
                <div key={item.sermon_code} className="card-elevated">
                  <div className="flex items-start gap-3">
                    <PlayButton
                      sermon={{
                        sermon_code: item.sermon_code,
                        title: item.title,
                        audio_url: item.audio_url,
                      }}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <Link
                        href={`/sermons/${item.sermon_code}`}
                        className="font-serif text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors line-clamp-2"
                      >
                        {item.title}
                      </Link>

                      <div className="text-[11px] text-[var(--text-secondary)] flex flex-wrap items-center gap-1.5">
                        {item.series_name && <span className="line-clamp-1">{item.series_name}</span>}
                        {item.series_name && item.date_preached && <span>·</span>}
                        {item.date_preached && <span>{formatDate(item.date_preached)}</span>}
                      </div>

                      <div className="text-[11px] text-[var(--text-secondary)] flex flex-wrap items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full border ${
                            item.is_completed
                              ? 'text-[var(--accent)] border-[var(--accent)]/35 bg-[var(--accent)]/10'
                              : 'text-[var(--text-secondary)] border-[var(--border-subtle)] bg-[var(--bg-primary)]'
                          }`}
                        >
                          {item.is_completed ? 'Completed' : 'In Progress'}
                        </span>
                        <span>{Math.round(item.progress_percent)}%</span>
                        <span>·</span>
                        <span>{formatDuration(item.listened_seconds)} listened</span>
                        <span>·</span>
                        <span>Last: {formatDate(item.last_played_at)}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-[var(--text-tertiary)] mr-0.5">Dates:</span>
                        {visibleDates.map((date) => (
                          <span
                            key={`${item.sermon_code}-${date}`}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                          >
                            {formatShortDate(date)}
                          </span>
                        ))}
                        {hiddenCount > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDates((prev) => ({
                                ...prev,
                                [item.sermon_code]: true,
                              }))
                            }
                            className="text-[10px] text-[var(--accent)] hover:underline"
                          >
                            +{hiddenCount} more
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {hasMoreHistory && (
              <button
                type="button"
                onClick={() => void fetchHistory(selectedRange, historyOffset, true)}
                disabled={historyLoading}
                className="btn btn-secondary w-full text-sm"
              >
                {historyLoading ? 'Loading...' : 'Load More History'}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
