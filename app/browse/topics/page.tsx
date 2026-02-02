import Link from 'next/link';
import { getAllTopics } from '@/lib/db';
import TopicSearch from '@/components/TopicSearch';

export default async function BrowseTopicsPage() {
  const topics = await getAllTopics();

  // Pattern to detect scripture references masquerading as topics
  const scriptureRefPattern = /^(\d\s+)?(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation)(\s+\d+.*)?$/i;

  // Clean up topic names (trim whitespace) and filter out scripture references
  const cleanTopics = topics.map((t) => ({
    ...t,
    name: t.name.trim(),
  })).filter((t) => t.name.length > 0 && !scriptureRefPattern.test(t.name.trim()));

  // Group topics by first letter
  const groupedTopics = cleanTopics.reduce((acc, topic) => {
    const firstLetter = topic.name[0].toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(topic);
    return acc;
  }, {} as Record<string, typeof cleanTopics>);

  const letters = Object.keys(groupedTopics).sort();

  return (
    <div className="pb-32 animate-fade-in">
      {/* Header */}
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-40 border-b border-white/5">
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">
          Browse by Topic
        </h1>
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
          {cleanTopics.length} topics
        </p>
      </header>

      <main className="px-4 py-4">
        {/* Topic Search */}
        <TopicSearch topics={cleanTopics} />

        {/* Most Popular */}
        <section className="mb-6">
          <h2 className="font-serif text-lg font-semibold mb-4 text-[var(--text-primary)]">
            Most Popular
          </h2>
            <div className="flex flex-wrap gap-2">
              {cleanTopics.slice(0, 15).map((topic) => (
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
              <div key={letter}>
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
