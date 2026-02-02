import { BookMarked, Music, User } from 'lucide-react';

interface AuthorQuoted {
  name: string;
  work?: string;
  quote?: string;
  context?: string;
}

interface HymnMentioned {
  title: string;
  author?: string;
  context?: string;
}

interface BookReferenced {
  title: string;
  author?: string;
  context?: string;
}

interface ExternalReferencesProps {
  authorsQuoted?: AuthorQuoted[];
  hymnsMentioned?: HymnMentioned[];
  booksReferenced?: BookReferenced[];
}

export default function ExternalReferences({ authorsQuoted, hymnsMentioned, booksReferenced }: ExternalReferencesProps) {
  const hasAuthors = authorsQuoted && authorsQuoted.length > 0;
  const hasHymns = hymnsMentioned && hymnsMentioned.length > 0;
  const hasBooks = booksReferenced && booksReferenced.length > 0;

  if (!hasAuthors && !hasHymns && !hasBooks) return null;

  return (
    <div className="card-elevated">
      <h3 className="font-serif text-lg font-bold text-[var(--text-primary)] mb-4">
        References & Sources
      </h3>

      {hasAuthors && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <User size={14} className="text-[var(--accent)]" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Authors Quoted
            </h4>
          </div>
          <div className="space-y-3">
            {authorsQuoted!.map((author, idx) => (
              <div key={idx} className="border-l-2 border-white/10 pl-3">
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  {author.name}
                </div>
                {author.work && (
                  <div className="text-xs italic text-[var(--text-tertiary)] mt-0.5">
                    {author.work}
                  </div>
                )}
                {author.quote && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1.5 italic leading-relaxed">
                    &ldquo;{author.quote}&rdquo;
                  </p>
                )}
                {author.context && (
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                    {author.context}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {hasBooks && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <BookMarked size={14} className="text-[var(--accent)]" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Books Referenced
            </h4>
          </div>
          <div className="space-y-2">
            {booksReferenced!.map((book, idx) => (
              <div key={idx} className="text-sm">
                <span className="text-[var(--text-primary)] font-medium italic">{book.title}</span>
                {book.author && (
                  <span className="text-[var(--text-tertiary)]"> by {book.author}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {hasHymns && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Music size={14} className="text-[var(--accent)]" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Hymns Mentioned
            </h4>
          </div>
          <div className="space-y-2">
            {hymnsMentioned!.map((hymn, idx) => (
              <div key={idx} className="text-sm">
                <span className="text-[var(--text-primary)] font-medium">{hymn.title}</span>
                {hymn.author && (
                  <span className="text-[var(--text-tertiary)]"> by {hymn.author}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
