import { Quote } from 'lucide-react';

interface NotableQuote {
  quote: string;
  context?: string;
  type?: string;
}

interface NotableQuotesProps {
  quotes: NotableQuote[];
}

export default function NotableQuotes({ quotes }: NotableQuotesProps) {
  if (!quotes || quotes.length === 0) return null;

  return (
    <div className="card-elevated">
      <div className="flex items-center gap-2 mb-4">
        <Quote size={18} className="text-[var(--accent)]" />
        <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
          Notable Quotes
        </h3>
      </div>

      <div className="space-y-4">
        {quotes.map((q, idx) => (
          <div key={idx} className="border-l-2 border-[var(--accent)] pl-4">
            {q.type && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)] mb-1.5 block">
                {q.type}
              </span>
            )}
            <p className="text-sm text-[var(--text-primary)] leading-relaxed font-serif italic">
              &ldquo;{q.quote}&rdquo;
            </p>
            {q.context && (
              <p className="text-xs text-[var(--text-tertiary)] mt-2">
                {q.context}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
