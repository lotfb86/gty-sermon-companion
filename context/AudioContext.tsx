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
  stop: () => void;
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
const QUEUE_DATA_VERSION = 2; // Bump this to force a cache bust

// ============ Self-Healing localStorage Helpers ============

/** Validate that an item looks like a real QueueItem */
function isValidQueueItem(item: unknown): item is QueueItem {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.sermonCode === 'string' && obj.sermonCode.length > 0 &&
    typeof obj.title === 'string' &&
    typeof obj.audioUrl === 'string' &&
    (obj.sourceType === 'individual' || obj.sourceType === 'series')
  );
}

/** Safely parse the queue from localStorage. Returns null if corrupt/missing. */
function safeParseQueue(): { items: QueueItem[]; currentIndex: number } | null {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Check data version — wipe if outdated
    if (parsed.version !== undefined && parsed.version !== QUEUE_DATA_VERSION) {
      console.warn('[GTY] Queue data version mismatch, clearing stale data');
      localStorage.removeItem(QUEUE_STORAGE_KEY);
      return null;
    }

    // Validate structure
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items)) {
      console.warn('[GTY] Queue data has invalid structure, clearing');
      localStorage.removeItem(QUEUE_STORAGE_KEY);
      return null;
    }

    // Filter to only valid items (self-healing: drops corrupted entries)
    const validItems = parsed.items.filter(isValidQueueItem);
    if (validItems.length !== parsed.items.length) {
      console.warn(`[GTY] Dropped ${parsed.items.length - validItems.length} corrupted queue items`);
    }

    if (validItems.length === 0) {
      // All items were corrupted — clear and start fresh
      localStorage.removeItem(QUEUE_STORAGE_KEY);
      return null;
    }

    return {
      items: validItems,
      currentIndex: parsed.currentIndex,
    };
  } catch (err) {
    // JSON.parse failed — data is corrupted
    console.error('[GTY] Queue localStorage is corrupted, clearing:', err);
    try {
      localStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch {
      // localStorage itself might be broken (private browsing, full, etc.)
    }
    return null;
  }
}

function getRestoredQueueIndex(queueItems: QueueItem[], savedIndex: unknown): number {
  const numericIndex = typeof savedIndex === 'number' ? savedIndex : parseInt(String(savedIndex || '-1'), 10);
  if (Number.isInteger(numericIndex) && numericIndex >= 0 && numericIndex < queueItems.length) {
    return numericIndex;
  }

  let bestIndex = -1;
  let bestTimestamp = 0;

  for (let index = 0; index < queueItems.length; index += 1) {
    const code = queueItems[index].sermonCode;
    try {
      const posRaw = localStorage.getItem(`sermon-${code}-position`);
      const tsRaw = localStorage.getItem(`sermon-${code}-lastPlayed`);

      const position = posRaw ? parseFloat(posRaw) : 0;
      const timestamp = tsRaw ? parseInt(tsRaw, 10) : 0;

      if (position > 0 && timestamp > bestTimestamp) {
        bestTimestamp = timestamp;
        bestIndex = index;
      }
    } catch {
      // localStorage read failed for this item — skip it
    }
  }

  return bestIndex;
}

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

  // Ref to signal that we want to auto-play once audio metadata is loaded
  const pendingPlayRef = useRef<boolean>(false);

  // Throttle timeupdate to ~2 updates/sec instead of ~4 to reduce re-renders on mobile
  const lastTimeUpdateRef = useRef<number>(0);

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
    }).catch((err) => console.error('[GTY] Failed to sync position to server:', err));
  }, [user]);

  // Position restore is handled in handleLoadedMetadata (not here)
  // to avoid race conditions with audio element src changes.

  // Save position periodically
  useEffect(() => {
    if (!currentSermon) return;

    const interval = setInterval(() => {
      if (audioRef.current && isPlaying) {
        const pos = audioRef.current.currentTime;
        const dur = audioRef.current.duration || 0;
        try {
          localStorage.setItem(`sermon-${currentSermon.code}-position`, pos.toString());
          localStorage.setItem(`sermon-${currentSermon.code}-lastPlayed`, Date.now().toString());
        } catch (err) {
          console.error('[GTY] Failed to save position to localStorage:', err);
        }
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
    }).catch((err) => console.error('[GTY] Failed to sync queue to server:', err));
  }, [user]);

  // Save queue to localStorage
  const saveQueueToLocal = useCallback((queueData: QueueItem[], index: number) => {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify({
        version: QUEUE_DATA_VERSION,
        items: queueData,
        currentIndex: index,
        updatedAt: new Date().toISOString(),
      }));
    } catch (err) {
      console.error('[GTY] Failed to save queue to localStorage:', err);
    }
  }, []);

  // Persist queue on changes
  useEffect(() => {
    if (!queueLoaded) return;
    saveQueueToLocal(queue, currentQueueIndex);
    if (user) {
      syncQueueToServer(queue);
    }
  }, [queue, currentQueueIndex, queueLoaded, user, saveQueueToLocal, syncQueueToServer]);

  // Load queue on mount — with self-healing corruption detection
  useEffect(() => {
    async function loadQueue() {
      // Try server first if logged in
      if (user) {
        try {
          const res = await fetch('/api/queue');
          if (res.ok) {
            const data = await res.json();
            if (data.queue && data.queue.length > 0) {
              const localQueue = safeParseQueue();
              if (localQueue) {
                const restoredIndex = getRestoredQueueIndex(localQueue.items, localQueue.currentIndex);
                setQueue(localQueue.items);
                setCurrentQueueIndex(restoredIndex);
                if (restoredIndex >= 0 && restoredIndex < localQueue.items.length) {
                  const item = localQueue.items[restoredIndex];
                  setCurrentSermon({
                    code: item.sermonCode,
                    title: item.title,
                    audioUrl: item.audioUrl,
                    book: item.book,
                    verse: item.verse,
                  });
                }
                setQueueLoaded(true);
                return;
              }
              // localStorage was corrupt/empty but server has queue — still mark loaded
              // The user will just have an empty client queue but the app won't be broken
            }
          }
        } catch (err) {
          console.error('[GTY] Failed to fetch queue from server:', err);
        }
      }

      // Fall back to localStorage (with self-healing)
      const localQueue = safeParseQueue();
      if (localQueue) {
        const restoredIndex = getRestoredQueueIndex(localQueue.items, localQueue.currentIndex);
        setQueue(localQueue.items);
        setCurrentQueueIndex(restoredIndex);
        if (restoredIndex >= 0 && restoredIndex < localQueue.items.length) {
          const item = localQueue.items[restoredIndex];
          setCurrentSermon({
            code: item.sermonCode,
            title: item.title,
            audioUrl: item.audioUrl,
            book: item.book,
            verse: item.verse,
          });
        }
      }

      setQueueLoaded(true);
    }

    loadQueue();
  }, [user]);

  // ============ Playback Controls ============

  const playSermonFromQueue = useCallback((item: QueueItem) => {
    pendingPlayRef.current = true;
    setCurrentSermon({
      code: item.sermonCode,
      title: item.title,
      audioUrl: item.audioUrl,
      book: item.book,
      verse: item.verse,
    });
    // No setTimeout — handleLoadedMetadata will restore position and start playback.
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

    // If same sermon, just resume playback
    if (currentSermon && currentSermon.code === sermon.code) {
      audioRef.current?.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    } else {
      // Different sermon — set pending play flag, then change sermon.
      // handleLoadedMetadata will restore saved position and start playback.
      pendingPlayRef.current = true;
      setCurrentSermon({
        code: sermon.code,
        title: sermon.title,
        audioUrl: sermon.audioUrl,
        book: sermon.book,
        verse: sermon.verse,
      });
    }
  };

  const pause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);

    if (currentSermon && audioRef.current) {
      const pos = audioRef.current.currentTime;
      const dur = audioRef.current.duration || 0;
      try {
        localStorage.setItem(`sermon-${currentSermon.code}-position`, pos.toString());
        localStorage.setItem(`sermon-${currentSermon.code}-lastPlayed`, Date.now().toString());
      } catch (err) {
        console.error('[GTY] Failed to save pause position:', err);
      }
      lastServerSync.current = 0;
      syncToServer(currentSermon.code, pos, dur);
    }
  };

  // Stop playback and dismiss the player (saves position first)
  const stop = () => {
    pause();
    setCurrentSermon(null);
    setCurrentTime(0);
    setDuration(0);
  };

  const togglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      audioRef.current?.play().catch(() => setIsPlaying(false));
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
      // Throttle state updates to ~2/sec to reduce re-render overhead on mobile.
      // The audio element's timeupdate fires ~4 times/sec; we don't need every one.
      const now = performance.now();
      if (now - lastTimeUpdateRef.current < 500) return;
      lastTimeUpdateRef.current = now;
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);

      // Restore saved position — safe now that metadata is loaded
      if (currentSermon) {
        try {
          const savedPosition = localStorage.getItem(`sermon-${currentSermon.code}-position`);
          if (savedPosition) {
            const pos = parseFloat(savedPosition);
            // Only restore if position is meaningful (not at the very end)
            if (pos > 0 && pos < audioRef.current.duration - 1) {
              audioRef.current.currentTime = pos;
            }
          }
        } catch (err) {
          console.error('[GTY] Failed to restore sermon position:', err);
        }
      }

      // Start playback if requested
      if (pendingPlayRef.current) {
        pendingPlayRef.current = false;
        audioRef.current.play().catch(() => setIsPlaying(false));
        setIsPlaying(true);
      }
    }
  }, [currentSermon]);

  const handleEnded = useCallback(() => {
    // Save final position
    if (currentSermon && audioRef.current) {
      const pos = audioRef.current.currentTime;
      const dur = audioRef.current.duration || 0;
      try {
        localStorage.setItem(`sermon-${currentSermon.code}-position`, pos.toString());
        localStorage.setItem(`sermon-${currentSermon.code}-lastPlayed`, Date.now().toString());
      } catch (err) {
        console.error('[GTY] Failed to save ended position:', err);
      }
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
        stop,
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
          playsInline
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
  stop: () => {},
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
