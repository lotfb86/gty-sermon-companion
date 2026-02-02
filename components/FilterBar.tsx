'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useTransition } from 'react';

interface SortOption {
  value: string;
  label: string;
}

interface FilterOption {
  key: string;
  label: string;
  type: 'toggle' | 'select';
  options?: { value: string; label: string }[];
}

interface FilterBarProps {
  sortOptions: SortOption[];
  defaultSort: string;
  filters?: FilterOption[];
  resultCount?: number;
  preserveKeys?: string[]; // URL params to preserve (e.g., 'q' for search)
}

export default function FilterBar({
  sortOptions,
  defaultSort,
  filters = [],
  resultCount,
  preserveKeys = [],
}: FilterBarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const currentSort = searchParams.get('sort') || defaultSort;

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams();

      // Preserve specified keys (like search query 'q')
      preserveKeys.forEach((key) => {
        const val = searchParams.get(key);
        if (val) params.set(key, val);
      });

      // Copy existing filter/sort params
      searchParams.forEach((value, key) => {
        if (key !== 'sort' && !preserveKeys.includes(key) && !Object.keys(updates).includes(key)) {
          params.set(key, value);
        }
      });

      // Apply updates
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      // Always include sort if not default
      const newSort = updates.sort !== undefined ? updates.sort : currentSort;
      if (newSort && newSort !== defaultSort) {
        params.set('sort', newSort);
      } else {
        params.delete('sort');
      }

      // Remove offset when filters change (reset pagination)
      if (!Object.keys(updates).includes('offset')) {
        params.delete('offset');
      }

      const queryString = params.toString();
      startTransition(() => {
        router.replace(pathname + (queryString ? '?' + queryString : ''), { scroll: false });
      });
    },
    [searchParams, router, pathname, currentSort, defaultSort, preserveKeys]
  );

  const handleSort = (value: string) => {
    updateParams({ sort: value === defaultSort ? null : value });
  };

  const handleToggle = (key: string) => {
    const current = searchParams.get(key);
    updateParams({ [key]: current ? null : '1' });
  };

  const handleSelect = (key: string, value: string) => {
    const current = searchParams.get(key);
    updateParams({ [key]: current === value ? null : value });
  };

  // Check if any non-default filters are active
  const hasActiveFilters = searchParams.get('sort') !== null ||
    filters.some((f) => searchParams.get(f.key) !== null);

  const clearAll = () => {
    const clearUpdates: Record<string, null> = { sort: null };
    filters.forEach((f) => {
      clearUpdates[f.key] = null;
    });
    updateParams(clearUpdates);
  };

  return (
    <div className={`space-y-2 ${isPending ? 'opacity-60' : ''} transition-opacity`}>
      {/* Sort Row */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider shrink-0 font-semibold">
          Sort
        </span>
        {sortOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleSort(opt.value)}
            className={`tag shrink-0 cursor-pointer ${
              currentSort === opt.value ? 'tag-active' : ''
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Filter Row */}
      {filters.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider shrink-0 font-semibold">
            Filter
          </span>
          {filters.map((filter) => {
            if (filter.type === 'toggle') {
              const isActive = searchParams.get(filter.key) === '1';
              return (
                <button
                  key={filter.key}
                  onClick={() => handleToggle(filter.key)}
                  className={`tag shrink-0 cursor-pointer ${isActive ? 'tag-active' : ''}`}
                >
                  {filter.label}
                </button>
              );
            }

            if (filter.type === 'select' && filter.options) {
              const currentValue = searchParams.get(filter.key);
              return filter.options.map((opt) => (
                <button
                  key={`${filter.key}-${opt.value}`}
                  onClick={() => handleSelect(filter.key, opt.value)}
                  className={`tag shrink-0 cursor-pointer ${
                    currentValue === opt.value ? 'tag-active' : ''
                  }`}
                >
                  {opt.label}
                </button>
              ));
            }

            return null;
          })}

          {/* Clear All */}
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="tag shrink-0 cursor-pointer text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              ✕ Clear
            </button>
          )}
        </div>
      )}

      {/* Result Count */}
      {resultCount !== undefined && (
        <div className="text-[10px] text-[var(--text-tertiary)]">
          Showing {resultCount.toLocaleString()} {resultCount === 1 ? 'result' : 'results'}
        </div>
      )}
    </div>
  );
}
