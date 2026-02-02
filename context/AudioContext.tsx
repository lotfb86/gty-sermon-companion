'use client';

import { createContext, useContext, useState, useRef, ReactNode, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

// ============ Queue Types ============

export interface QueueItem {
  sermonCode: string;
  title: string;
  audioUrl: string;
  book?: string;
  verse?: string;
  sourceType: 'individual' | 'series';
  sourceId?: number;
  seriesName?: string;
  seriesPosition?: number;
  seriesTotalCount?: number;
}

// ============ Context Interface ============

interface AudioContextType {
  // Current sermon being played
  currentSermon: {
    code: string;
    title: string;
    audioUrl: string;
    book?: string;
    verse?: string;
  } | null;

  // Playback state
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;

  // Basic controls
  play: (sermon: { code: string; title: string; audioUrl: string; book?: string; verse?: string }) => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  skip: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;

  // Queue state
  queue: QueueItem[];
  currentQueueIndex: number;

  // Queue controls
  addToQueue: (items: QueueItem | QueueItem[]) => void;
  removeFromQueue: (sermonCode: string) => void;
  moveInQueue: (sermonCode: string, direction: 'up' | 'down') => void;
  clearQueue: () => void;
  playNext: () => void;
  playPrevious: () => void;
  skipToQueueItem: (index: number) => void;

  // Audio element ref
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const QUEUE_STORAGE_KEY = 'gty-listening-queue';

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { user } = useAuth();

  const [currentSermon, setCurrentSermon] = useState<AudioContextType['currentSermon']>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [volume, setVolumeState] = useState(1);

  // Queue state
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  const [queueLoaded, setQueueLoaded] = useState(false);

  // Ref to track last server sync time
  const lastServerSync = useRef<number>(0);
  const lastQueueSync = useRef<number>(0);

  // ============ Position Sync ============

  const syncToServer = useCallback((sermonCode: string, position: number, dur: number) => {
    if (!user) return;
    const now = Date.now();
    if (now - lastServerSync.current < 15000) return;
    lastServerSync.current = now;

    fetch('/api/listening/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sermon_code: sermonCode, position, duration: dur }),
    }).catch(() => {});
  }, [user]);

  // Load saved position from localStorage
  useEffect(() => {
    if (currentSermon && audioRef.current) {
      const savedPosition = localStorage.getItem(`sermon-${currentSermon.code}-position`);
      if (savedPosition) {
        audioRef.current.currentTime = parseFloat(savedPosition);
      }
    }
  }, [currentSermon]);

  // Save position periodically
  useEffect(() => {
    if (!currentSermon) return;

    const interval = setInterval(() => {
      if (audioRef.current && isPlaying) {
        const pos = audioRef.current.currentTime;
        const dur = audioRef.current.duration || 0;
        localStorage.setItem(`sermon-${currentSermon.code}-position`, pos.toString());
        syncToServer(currentSermon.code, pos, dur);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, currentSermon, syncToServer]);

  // ============ Queue Persistence ============

  // Sync queue to server (debounced, single batch call)
  const syncQueueToServer = useCallback((queueData: QueueItem[]) => {
    if (!user) return;
    const now = Date.now();
    if (now - lastQueueSync.current < 2000) return;
    lastQueueSync.current = now;

    fetch('/api/queue/sync', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: queueData.map((item) => ({
          sermon_code: item.sermonCode,
          source_type: item.sourceType,
          source_id: item.sourceId || null,
        })),
      }),
    }).catch(() => {});
  }, [user]);

  // Save queue to localStorage
  const saveQueueToLocal = useCallback((queueData: QueueItem[], index: number) => {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify({
        items: queueData,
        currentIndex: index,
        updatedAt: new Date().toISOString(),
      }));
    } catch {}
  }, []);

  // Persist queue on changes
  useEffect(() => {
    if (!queueLoaded) return;
    saveQueueToLocal(queue, currentQueueIndex);
    if (user) {
      syncQueueToServer(queue);
    }
  }, [queue, currentQueueIndex, queueLoaded, user, saveQueueToLocal, syncQueueToServer]);

  // Load queue on mount
  useEffect(() => {
    async function loadQueue() {
      if (user) {
        try {
          const res = await fetch('/api/queue');
          if (res.ok) {
            const data = await res.json();
            if (data.queue && data.queue.length > 0) {
              // Server queue exists — convert to QueueItem format
              // We need sermon details which server queue doesn't have
              // Fall back to localStorage which has full details
              const localData = localStorage.getItem(QUEUE_STORAGE_KEY);
              if (localData) {
                const parsed = JSON.parse(localData);
                if (parsed.items?.length > 0) {
                  setQueue(parsed.items);
                  setCurrentQueueIndex(parsed.currentIndex ?? -1);
                  setQueueLoaded(true);
                  return;
                }
              }
            }
          }
        } catch {}
      }

      // Fall back to localStorage
      try {
        const localData = localStorage.getItem(QUEUE_STORAGE_KEY);
        if (localData) {
          const parsed = JSON.parse(localData);
          if (parsed.items?.length > 0) {
            setQueue(parsed.items);
            setCurrentQueueIndex(parsed.currentIndex ?? -1);
          }
        }
      } catch {}

      setQueueLoaded(true);
    }

    loadQueue();
  }, [user]);

  // ============ Playback Controls ============

  const playSermonFromQueue = useCallback((item: QueueItem) => {
    setCurrentSermon({
      code: item.sermonCode,
      title: item.title,
      audioUrl: item.audioUrl,
      book: item.book,
      verse: item.verse,
    });
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }, 100);
  }, []);

  const play = (sermon: { code: string; title: string; audioUrl: string; book?: string; verse?: string }) => {
    if (!sermon) return;

    // Insert at top of queue and play
    const newItem: QueueItem = {
      sermonCode: sermon.code,
      title: sermon.title,
      audioUrl: sermon.audioUrl,
      book: sermon.book,
      verse: sermon.verse,
      sourceType: 'individual',
    };

    setQueue(prev => {
      // Remove if already in queue
      const filtered = prev.filter(q => q.sermonCode !== sermon.code);
      return [newItem, ...filtered];
    });
    setCurrentQueueIndex(0);

    // If same sermon, just play
    if (currentSermon && currentSermon.code === sermon.code) {
      audioRef.current?.play();
      setIsPlaying(true);
    } else {
      setCurrentSermon({
        code: sermon.code,
        title: sermon.title,
        audioUrl: sermon.audioUrl,
        book: sermon.book,
        verse: sermon.verse,
      });
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }, 100);
    }
  };

  const pause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);

    if (currentSermon && audioRef.current) {
      const pos = audioRef.current.currentTime;
      const dur = audioRef.current.duration || 0;
      localStorage.setItem(`sermon-${currentSermon.code}-position`, pos.toString());
      lastServerSync.current = 0;
      syncToServer(currentSermon.code, pos, dur);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      audioRef.current?.play();
      setIsPlaying(true);
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const setPlaybackRate = (rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      setPlaybackRateState(rate);
    }
  };

  const setVolume = (vol: number) => {
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setVolumeState(vol);
    }
  };

  // ============ Queue Controls ============

  const addToQueue = (items: QueueItem | QueueItem[]) => {
    const itemsArr = Array.isArray(items) ? items : [items];
    setQueue(prev => {
      const existingCodes = new Set(prev.map(q => q.sermonCode));
      const newItems = itemsArr.filter(item => !existingCodes.has(item.sermonCode));
      return [...prev, ...newItems];
    });
  };

  const removeFromQueue = (sermonCode: string) => {
    setQueue(prev => {
      const idx = prev.findIndex(q => q.sermonCode === sermonCode);
      if (idx === -1) return prev;

      const newQueue = prev.filter(q => q.sermonCode !== sermonCode);

      // Adjust currentQueueIndex
      if (idx < currentQueueIndex) {
        setCurrentQueueIndex(i => i - 1);
      } else if (idx === currentQueueIndex) {
        // Removing currently playing item — don't change what's playing,
        // but adjust index to keep it pointing correctly
        if (currentQueueIndex >= newQueue.length) {
          setCurrentQueueIndex(newQueue.length - 1);
        }
      }

      return newQueue;
    });
  };

  const moveInQueue = (sermonCode: string, direction: 'up' | 'down') => {
    setQueue(prev => {
      const idx = prev.findIndex(q => q.sermonCode === sermonCode);
      if (idx === -1) return prev;

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;

      const newQueue = [...prev];
      [newQueue[idx], newQueue[targetIdx]] = [newQueue[targetIdx], newQueue[idx]];

      // Adjust currentQueueIndex if needed
      if (currentQueueIndex === idx) {
        setCurrentQueueIndex(targetIdx);
      } else if (currentQueueIndex === targetIdx) {
        setCurrentQueueIndex(idx);
      }

      return newQueue;
    });
  };

  const clearQueueAction = () => {
    setQueue([]);
    setCurrentQueueIndex(-1);
  };

  const playNext = useCallback(() => {
    const nextIndex = currentQueueIndex + 1;
    if (nextIndex < queue.length) {
      setCurrentQueueIndex(nextIndex);
      playSermonFromQueue(queue[nextIndex]);
    } else {
      // End of queue
      setIsPlaying(false);
    }
  }, [currentQueueIndex, queue, playSermonFromQueue]);

  const playPrevious = useCallback(() => {
    const prevIndex = currentQueueIndex - 1;
    if (prevIndex >= 0) {
      setCurrentQueueIndex(prevIndex);
      playSermonFromQueue(queue[prevIndex]);
    }
  }, [currentQueueIndex, queue, playSermonFromQueue]);

  const skipToQueueItem = (index: number) => {
    if (index >= 0 && index < queue.length) {
      setCurrentQueueIndex(index);
      playSermonFromQueue(queue[index]);
    }
  };

  // ============ Audio Event Handlers ============

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = useCallback(() => {
    // Save final position
    if (currentSermon && audioRef.current) {
      const pos = audioRef.current.currentTime;
      const dur = audioRef.current.duration || 0;
      localStorage.setItem(`sermon-${currentSermon.code}-position`, pos.toString());
      lastServerSync.current = 0;
      syncToServer(currentSermon.code, pos, dur);
    }

    // Auto-advance to next queue item
    const nextIndex = currentQueueIndex + 1;
    if (nextIndex < queue.length) {
      setCurrentQueueIndex(nextIndex);
      playSermonFromQueue(queue[nextIndex]);
    } else {
      setIsPlaying(false);
    }
  }, [currentSermon, currentQueueIndex, queue, syncToServer, playSermonFromQueue]);

  return (
    <AudioContext.Provider
      value={{
        currentSermon,
        isPlaying,
        currentTime,
        duration,
        playbackRate,
        volume,
        play,
        pause,
        togglePlay,
        seek,
        skip,
        setPlaybackRate,
        setVolume,
        queue,
        currentQueueIndex,
        addToQueue,
        removeFromQueue,
        moveInQueue,
        clearQueue: clearQueueAction,
        playNext,
        playPrevious,
        skipToQueueItem,
        audioRef,
      }}
    >
      {children}

      {/* Global Audio Element */}
      {currentSermon && (
        <audio
          ref={audioRef}
          src={currentSermon.audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          preload="metadata"
        />
      )}
    </AudioContext.Provider>
  );
}

// Default values for SSR
const defaultAudioContext: AudioContextType = {
  currentSermon: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  volume: 1,
  play: () => {},
  pause: () => {},
  togglePlay: () => {},
  seek: () => {},
  skip: () => {},
  setPlaybackRate: () => {},
  setVolume: () => {},
  queue: [],
  currentQueueIndex: -1,
  addToQueue: () => {},
  removeFromQueue: () => {},
  moveInQueue: () => {},
  clearQueue: () => {},
  playNext: () => {},
  playPrevious: () => {},
  skipToQueueItem: () => {},
  audioRef: { current: null },
};

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    return defaultAudioContext;
  }
  return context;
}
