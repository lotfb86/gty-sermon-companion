'use client';

import { useAudio } from '@/context/AudioContext';
import { Play, Pause, ExternalLink } from 'lucide-react';

interface PlayButtonProps {
  sermon: {
    sermon_code: string;
    title: string;
    audio_url?: string | null;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function PlayButton({ sermon, size = 'md', className = '' }: PlayButtonProps) {
  const { currentSermon, isPlaying, play, pause } = useAudio();

  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 28,
  };

  const isCurrentSermon = currentSermon?.code === sermon.sermon_code;
  const isCurrentlyPlaying = isCurrentSermon && isPlaying;

  if (!sermon.audio_url) {
    // Link to GTY.org where the sermon can be listened to
    const gtyUrl = `https://www.gty.org/sermons/${sermon.sermon_code}`;
    return (
      <a
        href={gtyUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`
          ${sizes[size]}
          flex items-center justify-center
          rounded-full
          bg-[var(--surface)]
          border border-[var(--accent)]/30
          text-[var(--accent)]
          hover:bg-[var(--accent-subtle)]
          hover:scale-105
          transition-all
          shrink-0
          ${className}
        `}
        title="Listen on GTY.org"
      >
        <ExternalLink size={iconSizes[size] - 2} />
      </a>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isCurrentlyPlaying) {
      pause();
    } else {
      play({
        code: sermon.sermon_code,
        title: sermon.title,
        audioUrl: sermon.audio_url!,
      });
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        ${sizes[size]}
        flex items-center justify-center
        rounded-full
        bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)]
        text-[var(--bg-primary)]
        hover:scale-105
        transition-all
        shadow-lg hover:shadow-xl
        shrink-0
        ${className}
      `}
      title={isCurrentlyPlaying ? 'Pause' : 'Play'}
    >
      {isCurrentlyPlaying ? (
        <Pause size={iconSizes[size]} fill="currentColor" />
      ) : (
        <Play size={iconSizes[size]} fill="currentColor" className="ml-0.5" />
      )}
    </button>
  );
}
