'use client';

import { useAudio } from '@/context/AudioContext';
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward } from 'lucide-react';
import Waveform from '@/components/Waveform';
import Link from 'next/link';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];

export default function NowPlaying() {
  const {
    currentSermon,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    togglePlay,
    seek,
    skip,
    setPlaybackRate,
    queue,
    currentQueueIndex,
    playNext,
    playPrevious,
  } = useAudio();

  if (!currentSermon) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hasNext = currentQueueIndex < queue.length - 1;
  const hasPrev = currentQueueIndex > 0;

  // Series context from queue
  const currentItem = currentQueueIndex >= 0 ? queue[currentQueueIndex] : null;
  const isFromSeries = currentItem?.sourceType === 'series' && currentItem?.seriesName;

  const cyclePlaybackRate = () => {
    const currentIdx = PLAYBACK_RATES.indexOf(playbackRate);
    const nextIdx = (currentIdx + 1) % PLAYBACK_RATES.length;
    setPlaybackRate(PLAYBACK_RATES[nextIdx]);
  };

  return (
    <div className="card-elevated">
      {/* Series Context */}
      {isFromSeries && (
        <div className="text-center mb-3">
          <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
            Now Playing from Series
          </span>
          <p className="text-xs text-[var(--accent)] font-medium mt-0.5">
            {currentItem.seriesName}
            {currentItem.seriesPosition && currentItem.seriesTotalCount && (
              <span className="text-[var(--text-tertiary)]">
                {' '} &middot; Sermon {currentItem.seriesPosition} of {currentItem.seriesTotalCount}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Sermon Info */}
      <div className="text-center mb-4">
        <Link href={`/sermons/${currentSermon.code}`}>
          <h2 className="font-serif text-lg font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors line-clamp-2">
            {currentSermon.title}
          </h2>
        </Link>
        {currentSermon.verse && (
          <p className="text-sm text-[var(--accent)] font-medium mt-1">
            {currentSermon.verse}
          </p>
        )}
      </div>

      {/* Waveform / Progress */}
      <div className="mb-2">
        <Waveform progress={progress} bars={50} className="h-12" />
      </div>

      {/* Seek Bar */}
      <div className="mb-4">
        <input
          type="range"
          min={0}
          max={duration || 1}
          value={currentTime}
          onChange={(e) => seek(parseFloat(e.target.value))}
          className="w-full h-1 bg-[var(--bg-elevated)] rounded-full appearance-none cursor-pointer accent-[var(--accent)]"
        />
        <div className="flex justify-between text-[11px] text-[var(--text-tertiary)] font-mono mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Previous */}
        <button
          onClick={playPrevious}
          disabled={!hasPrev}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            hasPrev
              ? 'text-[var(--text-secondary)] hover:bg-white/10'
              : 'text-[var(--text-quaternary)] opacity-30'
          }`}
        >
          <SkipBack size={20} fill="currentColor" />
        </button>

        {/* Rewind 15s */}
        <button
          onClick={() => skip(-15)}
          className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-white/10 transition-colors"
        >
          <Rewind size={18} />
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] text-[var(--bg-primary)] hover:scale-105 transition-all shadow-lg"
        >
          {isPlaying ? (
            <Pause size={24} fill="currentColor" />
          ) : (
            <Play size={24} fill="currentColor" className="ml-1" />
          )}
        </button>

        {/* Forward 15s */}
        <button
          onClick={() => skip(15)}
          className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-white/10 transition-colors"
        >
          <FastForward size={18} />
        </button>

        {/* Next */}
        <button
          onClick={playNext}
          disabled={!hasNext}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            hasNext
              ? 'text-[var(--text-secondary)] hover:bg-white/10'
              : 'text-[var(--text-quaternary)] opacity-30'
          }`}
        >
          <SkipForward size={20} fill="currentColor" />
        </button>
      </div>

      {/* Playback Rate */}
      <div className="flex justify-center mt-3">
        <button
          onClick={cyclePlaybackRate}
          className="text-xs font-mono font-bold text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors px-3 py-1 rounded-full border border-[var(--border-subtle)] hover:border-[var(--accent)]/30"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
}
