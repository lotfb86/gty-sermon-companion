import Link from 'next/link';
import { getAllTopics } from '@/lib/db';
import TopicSearch from '@/components/TopicSearch';
import AlphabetNav from '@/components/AlphabetNav';

/** Title-case a topic name: capitalize first letter of each word */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/(?:^|\s|[-/])\S/g, (match) => match.toUpperCase());
}

export default async function BrowseTopicsPage() {
  const topics = await getAllTopics();

  // Pattern to detect scripture references masquerading as topics
  const scriptureRefPattern = /^(\d\s+)?(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation)(\s+\d+.*)?$/i;

  // Clean and filter topics
  const cleanTopics = topics
    .map((t) => ({ ...t, name: t.name.trim() }))
    .filter((t) => t.name.length > 0 && !scriptureRefPattern.test(t.name.trim()));

  // Deduplicate: group by lowercase name, keep the topic with the highest sermon count
  // (don't sum counts, as each ID links to its own sermons)
  const deduped = (() => {
    const map = new Map<string, { id: number; name: string; sermon_count: number }>();
    for (const t of cleanTopics) {
      const key = t.name.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        // Keep the one with more sermons
        if (t.sermon_count > existing.sermon_count) {
          map.set(key, { id: t.id, name: toTitleCase(t.name), sermon_count: t.sermon_count });
        }
      } else {
        map.set(key, { id: t.id, name: toTitleCase(t.name), sermon_count: t.sermon_count });
      }
    }
    return Array.from(map.values());
  })();

  // Filter out topics with 0 sermons and sort alphabetically
  const displayTopics = deduped
    .filter((t) => t.sermon_count > 0)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  // Get the top 15 by sermon count for "Most Popular"
  const mostPopular = [...displayTopics].sort((a, b) => b.sermon_count - a.sermon_count).slice(0, 15);

  // Group topics by first letter
  const groupedTopics = displayTopics.reduce((acc, topic) => {
    const firstChar = topic.name[0]?.toUpperCase() || '#';
    const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(topic);
    return acc;
  }, {} as Record<string, typeof displayTopics>);

  const letters = Object.keys(groupedTopics).sort();

  return (
    <div className="pb-32 animate-fade-in">
      {/* Header + Alphabet Nav (sticky together) */}
      <header className="glass sticky top-0 z-40 border-b border-white/5">
        <div className="px-4 pt-10 pb-2">
          <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">
            Browse by Topic
          </h1>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
            {displayTopics.length} topics
          </p>
        </div>
        {/* Alphabet Quick-Nav */}
        <AlphabetNav letters={letters} />
      </header>

      <main className="px-4 py-4">
        {/* Topic Search */}
        <TopicSearch topics={displayTopics} />

        {/* Most Popular */}
        <section className="mb-6">
          <h2 className="font-serif text-lg font-semibold mb-4 text-[var(--text-primary)]">
            Most Popular
          </h2>
          <div className="flex flex-wrap gap-2">
            {mostPopular.map((topic) => (
              <Link
                key={topic.id}
                href={`/topics/${topic.id}`}
                className="tag text-sm"
              >
                {topic.name} ({topic.sermon_count})
              </Link>
            ))}
          </div>
        </section>

        {/* All Topics A-Z */}
        <section>
          <h2 className="font-serif text-lg font-semibold mb-4 text-[var(--text-primary)]">
            All Topics A-Z
          </h2>

          <div className="space-y-6">
            {letters.map((letter) => (
              <div key={letter} id={`topic-letter-${letter}`}>
                <h3 className="font-serif text-2xl font-semibold text-[var(--accent)] mb-3">
                  {letter}
                </h3>
                <div className="grid gap-2">
                  {groupedTopics[letter].map((topic) => (
                    <Link
                      key={topic.id}
                      href={`/topics/${topic.id}`}
                      className="card group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-serif font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                          {topic.name}
                        </div>
                        <div className="text-sm text-[var(--text-tertiary)]">
                          {topic.sermon_count} sermon{topic.sermon_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
