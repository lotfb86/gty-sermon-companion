'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search as SearchIcon } from 'lucide-react';

interface MetadataSearchProps {
  placeholder?: string;
}

export default function MetadataSearch({ placeholder = 'Search...' }: MetadataSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    const qs = params.toString();
    router.push(`?${qs}`);
  };

  const handleClear = () => {
    setQuery('');
    router.push('?');
  };

  return (
    <form onSubmit={handleSubmit} className="relative mb-4">
      <SearchIcon
        className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
        size={16}
      />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-3 bg-[var(--surface)] border border-[rgba(255,255,255,0.1)] rounded-full text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors text-sm"
        >
          ✕
        </button>
      )}
    </form>
  );
}
