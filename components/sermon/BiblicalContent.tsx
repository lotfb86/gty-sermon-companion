import Link from 'next/link';
import { Users, MapPin, Clock } from 'lucide-react';

interface CharacterDiscussed {
  name: string;
  testament?: string;
  prominence?: string;
}

interface BiblicalContentProps {
  charactersDiscussed?: CharacterDiscussed[];
  placesMentioned?: string[];
  timePeriod?: string;
}

export default function BiblicalContent({ charactersDiscussed, placesMentioned, timePeriod }: BiblicalContentProps) {
  const hasCharacters = charactersDiscussed && charactersDiscussed.length > 0;
  const hasPlaces = placesMentioned && placesMentioned.length > 0;

  if (!hasCharacters && !hasPlaces && !timePeriod) return null;

  return (
    <div className="card-elevated">
      <h3 className="font-serif text-lg font-bold text-[var(--text-primary)] mb-4">
        Biblical Context
      </h3>

      {timePeriod && (
        <div className="flex items-center gap-2 mb-4 text-xs">
          <Clock size={14} className="text-[var(--accent)]" />
          <span className="text-[var(--text-secondary)]">
            Time Period: <span className="text-[var(--text-primary)] font-medium">{timePeriod}</span>
          </span>
        </div>
      )}

      {hasCharacters && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-[var(--accent)]" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              People Discussed
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {charactersDiscussed!.map((char, idx) => (
              <Link
                key={idx}
                href={`/search?q=${encodeURIComponent(char.name)}`}
                className={`tag ${
                  char.prominence === 'Central' || char.prominence === 'Major'
                    ? 'tag-active'
                    : ''
                }`}
              >
                {char.name}
                {char.testament && (
                  <span className="ml-1 text-[10px] opacity-60">({char.testament})</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {hasPlaces && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={14} className="text-[var(--accent)]" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Places Mentioned
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {placesMentioned!.map((place, idx) => (
              <Link
                key={idx}
                href={`/search?q=${encodeURIComponent(place)}`}
                className="tag"
              >
                {place}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
