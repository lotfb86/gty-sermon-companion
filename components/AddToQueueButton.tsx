'use client';

import { useState } from 'react';
import { ListPlus, Check, Loader2 } from 'lucide-react';
import { useAudio, type QueueItem } from '@/context/AudioContext';

interface AddToQueueButtonProps {
  /** For adding a single sermon */
  sermon?: {
    sermon_code: string;
    title: string;
    audio_url?: string;
    verse?: string;
    book?: string;
  };
  /** For adding an entire series */
  seriesId?: number;
  seriesName?: string;
  /** 'icon' = small plus icon, 'button' = full button with text */
  variant?: 'icon' | 'button';
  className?: string;
}

export default function AddToQueueButton({
  sermon,
  seriesId,
  seriesName,
  variant = 'icon',
  className = '',
}: AddToQueueButtonProps) {
  const { addToQueue, queue } = useAudio();
  const [status, setStatus] = useState<'idle' | 'loading' | 'added'>('idle');

  const isInQueue = sermon
    ? queue.some(q => q.sermonCode === sermon.sermon_code)
    : false;

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (status === 'loading' || status === 'added') return;

    // Single sermon
    if (sermon) {
      if (isInQueue) return;

      const item: QueueItem = {
        sermonCode: sermon.sermon_code,
        title: sermon.title,
        audioUrl: sermon.audio_url || '',
        book: sermon.book,
        verse: sermon.verse,
        sourceType: 'individual',
      };
      addToQueue(item);
      setStatus('added');
      setTimeout(() => setStatus('idle'), 2000);
      return;
    }

    // Series
    if (seriesId) {
      setStatus('loading');
      try {
        const res = await fetch(`/api/series/${seriesId}/sermons`);
        if (!res.ok) throw new Error('Failed to fetch series');
        const data = await res.json();

        const items: QueueItem[] = data.sermons.map((s: any, i: number) => ({
          sermonCode: s.sermon_code,
          title: s.title,
          audioUrl: s.audio_url || '',
          book: s.verse?.split(' ')[0],
          verse: s.verse,
          sourceType: 'series' as const,
          sourceId: seriesId,
          seriesName: seriesName || data.series?.name,
          seriesPosition: i + 1,
          seriesTotalCount: data.sermons.length,
        }));

        addToQueue(items);
        setStatus('added');
        setTimeout(() => setStatus('idle'), 2000);
      } catch (err) {
        console.error('[GTY] Failed to add series to queue:', err);
        setStatus('idle');
      }
      return;
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleAdd}
        disabled={isInQueue || status === 'loading'}
        className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
          isInQueue || status === 'added'
            ? 'text-[var(--accent)] bg-[var(--accent)]/10'
            : 'text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-white/10'
        } ${className}`}
        title={isInQueue ? 'In queue' : 'Add to queue'}
      >
        {status === 'loading' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : isInQueue || status === 'added' ? (
          <Check size={16} />
        ) : (
          <ListPlus size={16} />
        )}
      </button>
    );
  }

  // Full button variant
  return (
    <button
      onClick={handleAdd}
      disabled={isInQueue || status === 'loading'}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        isInQueue || status === 'added'
          ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
          : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)]'
      } ${className}`}
    >
      {status === 'loading' ? (
        <Loader2 size={16} className="animate-spin" />
      ) : isInQueue || status === 'added' ? (
        <Check size={16} />
      ) : (
        <ListPlus size={16} />
      )}
      {seriesId
        ? isInQueue || status === 'added'
          ? 'Series Added'
          : status === 'loading'
            ? 'Adding Series...'
            : 'Add Series to Queue'
        : isInQueue || status === 'added'
          ? 'In Queue'
          : 'Add to Queue'
      }
    </button>
  );
}
