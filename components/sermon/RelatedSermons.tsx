import Link from 'next/link';
import type { Sermon } from '@/lib/db';
import PlayButton from '@/components/PlayButton';

interface RelatedSermonsProps {
  sermons: Sermon[];
}

export default function RelatedSermons({ sermons }: RelatedSermonsProps) {
  if (!sermons || sermons.length === 0) return null;

  return (
    <div className="card-elevated">
      <h3 className="font-serif text-lg font-bold mb-4 text-[var(--text-primary)]">
        Continue Your Study
      </h3>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {sermons.map((sermon) => (
          <Link
            key={sermon.id}
            href={`/sermons/${sermon.sermon_code}`}
            className="flex-shrink-0 w-48 p-3 rounded-xl bg-[var(--surface)] border border-white/5 hover:border-[var(--accent)]/30 transition-all group"
          >
            <div className="flex items-start justify-between mb-2">
              <PlayButton sermon={sermon} size="sm" />
              {sermon.date_preached && (
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  {new Date(sermon.date_preached).getFullYear()}
                </span>
              )}
            </div>
            <h4 className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-2 leading-tight mb-1">
              {sermon.title}
            </h4>
            {sermon.verse && (
              <span className="text-[10px] text-[var(--accent)]">
                {sermon.verse}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
