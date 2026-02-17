'use client';

import { useEffect, useState } from 'react';
import { useAudio } from '@/context/AudioContext';
import { Play, Pause, RotateCcw, RotateCw, Volume2 } from 'lucide-react';

export default function AudioPlayer() {
  const {
    currentSermon,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    togglePlay,
    seek,
    skip,
    setPlaybackRate,
    setVolume,
  } = useAudio();

  // iOS does not support programmatic volume control on media elements.
  // Detect iOS to hide the volume slider since it does nothing on those devices.
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

  if (!currentSermon) {
    return null; // No sermon loaded
  }

  const formatTime = (time: number) => {
    if (!isFinite(time)) return '0:00';
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full space-y-4">
      {/* Progress Bar */}
      <div>
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={(e) => seek(parseFloat(e.target.value))}
          className="w-full h-2 bg-[var(--border-medium)] rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${progress}%, rgba(255,255,255,0.1) ${progress}%, rgba(255,255,255,0.1) 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-[var(--text-tertiary)] mt-2 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Skip Back 15s */}
        <button
          onClick={() => skip(-15)}
          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-primary)] group"
          title="Rewind 15 seconds"
        >
          <div className="relative">
            <RotateCcw size={20} className="group-hover:scale-110 transition-transform" />
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold">15</span>
          </div>
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] text-[var(--bg-primary)] hover:scale-105 transition-all shadow-lg hover:shadow-xl"
        >
          {isPlaying ? (
            <Pause size={28} fill="currentColor" />
          ) : (
            <Play size={28} fill="currentColor" className="ml-0.5" />
          )}
        </button>

        {/* Skip Forward 15s */}
        <button
          onClick={() => skip(15)}
          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-primary)] group"
          title="Fast forward 15 seconds"
        >
          <div className="relative">
            <RotateCw size={20} className="group-hover:scale-110 transition-transform" />
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold">15</span>
          </div>
        </button>
      </div>

      {/* Playback Speed Controls */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-[var(--text-tertiary)] font-medium mr-1">Speed:</span>
        {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
          <button
            key={rate}
            onClick={() => setPlaybackRate(rate)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              playbackRate === rate
                ? 'bg-[var(--accent)] text-[var(--bg-primary)] shadow-md'
                : 'bg-[var(--surface)] text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)]'
            }`}
          >
            {rate}x
          </button>
        ))}
      </div>

      {/* Volume Control - hidden on iOS where programmatic volume is not supported */}
      {!isIOS && (
        <div className="flex items-center gap-3">
          <Volume2 size={18} className="text-[var(--text-tertiary)] shrink-0" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-[var(--border-medium)] rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%, rgba(255,255,255,0.1) 100%)`,
            }}
          />
          <span className="text-xs text-[var(--text-tertiary)] w-10 text-right font-mono">
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
