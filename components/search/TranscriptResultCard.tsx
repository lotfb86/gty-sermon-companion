import Link from 'next/link';
import PlayButton from '@/components/PlayButton';
import AddToQueueButton from '@/components/AddToQueueButton';
import type { TranscriptSnippet } from '@/lib/snippets';

interface TranscriptSearchResult {
  id: number;
  sermon_code: string;
  title: string;
  audio_url?: string;
  date_preached?: string;
  verse?: string;
  series_name?: string;
  snippets: TranscriptSnippet[];
}

interface TranscriptResultCardProps {
  result: TranscriptSearchResult;
  query: string;
}

export default function TranscriptResultCard({ result, query }: TranscriptResultCardProps) {
  return (
    <div className="card group relative">
      <div className="flex items-start gap-3">
        <PlayButton sermon={result} size="sm" />
        <Link href={`/sermons/${result.sermon_code}?t=${encodeURIComponent(query)}`} className="flex-1 min-w-0">
          <div className="mb-2">
            <h3 className="font-serif font-semibold text-sm text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
              {result.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)] mt-0.5">
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--surface-2)]/50 text-[var(--text-tertiary)]">
                Code {result.sermon_code}
              </span>
              {result.date_preached && (
                <span>
                  {new Date(result.date_preached).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              )}
              {result.series_name && (
                <>
                  <span>·</span>
                  <span className="line-clamp-1">{result.series_name}</span>
                </>
              )}
            </div>
            {result.verse && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)] mt-1">
                <span className="text-[var(--accent)] font-medium">Primary Text: {result.verse}</span>
              </div>
            )}
          </div>

          {/* Transcript Snippets */}
          {result.snippets.length > 0 && (
            <div className="space-y-1.5">
              {result.snippets.map((snippet, idx) => (
                <p
                  key={idx}
                  className="text-xs text-[var(--text-tertiary)] leading-relaxed line-clamp-2 [&_mark]:bg-[var(--accent)]/20 [&_mark]:text-[var(--accent)] [&_mark]:px-0.5 [&_mark]:rounded"
                  dangerouslySetInnerHTML={{ __html: snippet.text }}
                />
              ))}
            </div>
          )}
        </Link>
      </div>
      <div className="absolute top-2 right-2">
        <AddToQueueButton sermon={result} variant="icon" />
      </div>
    </div>
  );
}

export type { TranscriptSearchResult };
