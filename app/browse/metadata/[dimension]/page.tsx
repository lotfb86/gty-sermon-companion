import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getDimension } from '@/lib/metadata';
import { getCachedMetadataValues, countCachedMetadataValues } from '@/lib/db';
import MetadataSearch from '@/components/MetadataSearch';

interface PageProps {
  params: Promise<{ dimension: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BrowseMetadataPage({ params, searchParams }: PageProps) {
  const { dimension: slug } = await params;
  const sp = await searchParams;
  const dim = getDimension(slug);

  if (!dim) return notFound();

  const search = (sp.q as string) || '';

  // Get total count and values from pre-computed cache
  const totalCount = await countCachedMetadataValues(slug, search || undefined);
  const popular = await getCachedMetadataValues(slug, {
    search: search || undefined,
    limit: search ? 100 : 20,
  });

  // For small dimensions or when not searching, get all for A-Z
  const showAZ = !search && totalCount <= 500;
  const allValues = showAZ
    ? await getCachedMetadataValues(slug, { limit: 10000 })
    : null;

  // Group A-Z
  const grouped = allValues
    ? allValues.reduce((acc, item) => {
        const letter = item.value[0]?.toUpperCase() || '#';
        if (!acc[letter]) acc[letter] = [];
        acc[letter].push(item);
        return acc;
      }, {} as Record<string, typeof allValues>)
    : null;

  const letters = grouped ? Object.keys(grouped).sort() : null;

  const basePath = `/browse/metadata/${slug}`;

  return (
    <div className="pb-32 animate-fade-in">
      {/* Header */}
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-40 border-b border-white/5">
        <Link
          href="/browse/scripture"
          className="text-[var(--accent)] text-xs hover:text-[var(--accent-hover)] transition-colors mb-2 inline-block"
        >
          ← Back to Browse
        </Link>
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">
          {dim.labelPlural}
        </h1>
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
          {totalCount.toLocaleString()} {totalCount === 1 ? dim.label.toLowerCase() : dim.labelPlural.toLowerCase()}
        </p>
      </header>

      <main className="px-4 py-4">
        {/* Search */}
        <Suspense fallback={null}>
          <MetadataSearch placeholder={`Search ${dim.labelPlural.toLowerCase()}...`} />
        </Suspense>

        {search && (
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-4">
            {popular.length} result{popular.length !== 1 ? 's' : ''} for &quot;{search}&quot;
          </p>
        )}

        {/* Most Popular / Search Results */}
        <section className="mb-6">
          {!search && (
            <h2 className="font-serif text-lg font-semibold mb-4 text-[var(--text-primary)]">
              Most Popular
            </h2>
          )}
          {popular.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {popular.map((item) => (
                <Link
                  key={item.value}
                  href={`${basePath}/${encodeURIComponent(item.value)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                    bg-[var(--surface)] border border-[var(--border-subtle)]
                    text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40
                    transition-all"
                >
                  <span>{item.value}</span>
                  <span className="text-[var(--text-quaternary)]">{item.sermon_count}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-[var(--text-secondary)]">No results found</p>
            </div>
          )}
        </section>

        {/* All A-Z (only for small dimensions without search) */}
        {grouped && letters && (
          <section>
            <h2 className="font-serif text-lg font-semibold mb-4 text-[var(--text-primary)]">
              All {dim.labelPlural} A-Z
            </h2>
            <div className="space-y-6">
              {letters.map((letter) => (
                <div key={letter}>
                  <h3 className="font-serif text-2xl font-semibold text-[var(--accent)] mb-3">
                    {letter}
                  </h3>
                  <div className="grid gap-2">
                    {grouped[letter].map((item) => (
                      <Link
                        key={item.value}
                        href={`${basePath}/${encodeURIComponent(item.value)}`}
                        className="card group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-serif font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                            {item.value}
                          </div>
                          <div className="text-sm text-[var(--text-tertiary)]">
                            {item.sermon_count} sermon{item.sermon_count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
