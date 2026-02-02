'use client';

import { useAudio } from '@/context/AudioContext';
import { Trash2 } from 'lucide-react';
import QueueItem from './QueueItem';

export default function QueueList() {
  const {
    queue,
    currentQueueIndex,
    removeFromQueue,
    moveInQueue,
    clearQueue,
    skipToQueueItem,
  } = useAudio();

  // Only show items after the currently playing one
  const upNextItems = queue.slice(currentQueueIndex + 1);

  if (upNextItems.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif text-base font-semibold text-[var(--text-primary)]">
          Up Next
          <span className="text-[var(--text-tertiary)] font-normal text-sm ml-2">
            {upNextItems.length} sermon{upNextItems.length !== 1 ? 's' : ''}
          </span>
        </h3>
        <button
          onClick={clearQueue}
          className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-red-400 transition-colors"
        >
          <Trash2 size={12} />
          Clear
        </button>
      </div>

      <div className="space-y-1.5">
        {upNextItems.map((item, i) => {
          const actualIndex = currentQueueIndex + 1 + i;
          return (
            <QueueItem
              key={item.sermonCode}
              item={item}
              index={i}
              isFirst={i === 0}
              isLast={i === upNextItems.length - 1}
              onMoveUp={() => moveInQueue(item.sermonCode, 'up')}
              onMoveDown={() => moveInQueue(item.sermonCode, 'down')}
              onRemove={() => removeFromQueue(item.sermonCode)}
              onSkipTo={() => skipToQueueItem(actualIndex)}
            />
          );
        })}
      </div>
    </div>
  );
}
