'use client';

import { useAudio } from '@/context/AudioContext';
import { Play, Pause, SkipBack, SkipForward, X } from 'lucide-react';
import Link from 'next/link';
import Waveform from './Waveform';

export default function MiniPlayer() {
  const {
    currentSermon,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    pause,
    queue,
    currentQueueIndex,
    playNext,
    playPrevious,
  } = useAudio();

  if (!currentSermon) {
    return null;
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hasNext = currentQueueIndex < queue.length - 1;
  const hasPrev = currentQueueIndex > 0;
  const hasQueue = queue.length > 1;

  return (
    <div className="fixed bottom-14 left-0 right-0 z-40">
      <div className="max-w-md mx-auto px-3">
        <Link href={`/sermons/${currentSermon.code}`}>
          <div className="glass border border-white/10 rounded-xl p-3 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2.5">
              {/* Previous Button (only when queue active) */}
              {hasQueue && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    playPrevious();
                  }}
                  disabled={!hasPrev}
                  className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors shrink-0 ${
                    hasPrev
                      ? 'text-[var(--text-secondary)] hover:bg-white/10'
                      : 'text-[var(--text-quaternary)] opacity-40'
                  }`}
                >
                  <SkipBack size={14} fill="currentColor" />
                </button>
              )}

              {/* Play/Pause Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  togglePlay();
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] text-[var(--bg-primary)] hover:scale-105 transition-all shadow-lg shrink-0"
              >
                {isPlaying ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" className="ml-0.5" />
                )}
              </button>

              {/* Next Button (only when queue active) */}
              {hasQueue && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    playNext();
                  }}
                  disabled={!hasNext}
                  className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors shrink-0 ${
                    hasNext
                      ? 'text-[var(--text-secondary)] hover:bg-white/10'
                      : 'text-[var(--text-quaternary)] opacity-40'
                  }`}
                >
                  <SkipForward size={14} fill="currentColor" />
                </button>
              )}

              {/* Sermon Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-serif font-bold text-[var(--text-primary)] line-clamp-1 flex-1">
                    {currentSermon.title}
                  </h4>
                  {hasQueue && (
                    <span className="text-[9px] font-mono text-[var(--accent)] shrink-0">
                      {currentQueueIndex + 1}/{queue.length}
                    </span>
                  )}
                </div>
                {currentSermon.verse && (
                  <p className="text-[11px] text-[var(--accent)] font-medium mt-0.5">
                    {currentSermon.verse}
                  </p>
                )}

                {/* Mini Waveform */}
                <div className="mt-1.5">
                  <Waveform progress={progress} bars={20} className="h-5 opacity-60" />
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  pause();
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-[var(--text-tertiary)] shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
