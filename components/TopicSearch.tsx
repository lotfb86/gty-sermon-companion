'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search as SearchIcon } from 'lucide-react';

interface TopicItem {
  id: number;
  name: string;
  sermon_count: number;
}

interface TopicSearchProps {
  topics: TopicItem[];
}

export default function TopicSearch({ topics }: TopicSearchProps) {
  const [query, setQuery] = useState('');

  const filteredTopics = useMemo(() => {
    if (!query.trim()) return null; // null = show default view
    const lower = query.toLowerCase().trim();
    return topics.filter((t) => t.name.toLowerCase().includes(lower));
  }, [query, topics]);

  return (
    <div>
      {/* Search Input */}
      <div className="relative mb-4">
        <SearchIcon
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
          size={16}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter topics..."
          className="w-full pl-10 pr-4 py-3 bg-[var(--surface)] border border-[rgba(255,255,255,0.1)] rounded-full text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {/* Search Results */}
      {filteredTopics !== null && (
        <div className="mb-6">
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
            {filteredTopics.length} topic{filteredTopics.length !== 1 ? 's' : ''} matching &quot;{query}&quot;
          </p>
          {filteredTopics.length > 0 ? (
            <div className="grid gap-2">
              {filteredTopics.map((topic) => (
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
          ) : (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm text-[var(--text-secondary)]">No topics found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
