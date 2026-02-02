import Link from 'next/link';
import { Shield, AlertTriangle } from 'lucide-react';

interface DoctrineSectionProps {
  keyDoctrinesDefended?: string[];
  heresiesRefuted?: string[];
}

export default function DoctrineSection({ keyDoctrinesDefended, heresiesRefuted }: DoctrineSectionProps) {
  const hasDoctrines = keyDoctrinesDefended && keyDoctrinesDefended.length > 0;
  const hasHeresies = heresiesRefuted && heresiesRefuted.length > 0;

  if (!hasDoctrines && !hasHeresies) return null;

  return (
    <div className="card-elevated">
      <h3 className="font-serif text-lg font-bold text-[var(--text-primary)] mb-4">
        Doctrine
      </h3>

      {hasDoctrines && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-[var(--accent)]" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Key Doctrines Defended
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {keyDoctrinesDefended!.map((doctrine, idx) => (
              <Link
                key={idx}
                href={`/search?q=${encodeURIComponent(doctrine)}`}
                className="tag"
              >
                {doctrine}
              </Link>
            ))}
          </div>
        </div>
      )}

      {hasHeresies && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-500" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              False Teachings Addressed
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {heresiesRefuted!.map((heresy, idx) => (
              <Link
                key={idx}
                href={`/search?q=${encodeURIComponent(heresy)}`}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
              >
                {heresy}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
