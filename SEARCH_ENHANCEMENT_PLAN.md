# Enhanced Search Implementation Plan
## GTY Sermon Companion - Relevance-Based Search with Series & Sermon Sections

---

## 📋 Overview

**Goal:** Implement intelligent search that:
1. Separates results into **Series** and **Sermons** sections
2. Ranks results by **relevance** (frequency of search term)
3. Shows most relevant content first (most mentions → top, fewest → bottom)

**Example:** Searching "armor of God" should show:
- **Series Section:** Series that teach about the armor of God
- **Sermons Section:** Individual sermons ranked by how much they discuss the topic

---

## 🏗️ Architecture Strategy

### Option A: Term Frequency Scoring (Recommended)
**Pros:**
- Works with current SQLite setup
- No additional dependencies
- Full control over scoring algorithm
- Can weight different fields (title > transcript)

**Cons:**
- More manual SQL logic
- Slower for very large datasets

### Option B: SQLite FTS5 (Full-Text Search)
**Pros:**
- Built-in relevance ranking
- Faster for large text searches
- Industry standard

**Cons:**
- Requires rebuilding database with FTS virtual tables
- Less control over custom scoring
- More complex migration

**Decision:** Start with **Option A** (Term Frequency), can upgrade to FTS5 later if needed.

---

## 📊 Data Structures

### Current Database Schema
```sql
-- Sermons Table
sermons (
  id, sermon_code, title, description,
  date_preached, duration, audio_url,
  transcript_text, series_id, llm_metadata
)

-- Series Table
series (
  id, name, book, description
)

-- Topics (for future use)
topics (id, name, category)
sermon_topics (sermon_id, topic_id)
```

### New Search Result Interfaces

```typescript
// Series search result with relevance
export interface SeriesSearchResult {
  id: number;
  name: string;
  book?: string;
  description?: string;
  sermon_count: number;
  relevance_score: number;  // NEW
  match_count: number;       // NEW: Total mentions across all sermons
  matching_sermons: number;  // NEW: How many sermons in series match
}

// Sermon search result with relevance
export interface SermonSearchResult extends Sermon {
  relevance_score: number;   // NEW
  title_matches: number;     // NEW
  transcript_matches: number; // NEW
  series_name?: string;      // NEW
}

// Combined search response
export interface SearchResults {
  query: string;
  series: SeriesSearchResult[];
  sermons: SermonSearchResult[];
  total_results: number;
}
```

---

## 🧮 Relevance Scoring Algorithm

### Weighted Term Frequency

**Formula:**
```
relevance_score =
  (title_matches × 10) +
  (description_matches × 5) +
  (transcript_matches × 1) +
  (topic_matches × 7)
```

**Weighting Rationale:**
- **Title match (10x):** If it's in the title, it's likely the main topic
- **Topic match (7x):** Tagged topics are highly relevant
- **Description match (5x):** Official summary mentions are important
- **Transcript match (1x):** Base score for body content

**Why Term Frequency?**
- "Armor of God" mentioned 50 times → More focused sermon
- "Armor of God" mentioned 2 times → Brief mention

---

## 🔍 Implementation Steps

### Phase 1: Database Functions (lib/db.ts)

#### 1.1 Create `searchSeriesWithRelevance()`
```typescript
export function searchSeriesWithRelevance(query: string, limit = 10) {
  const searchTerm = `%${query}%`;

  const stmt = db.prepare(`
    WITH sermon_matches AS (
      SELECT
        s.series_id,
        s.id as sermon_id,
        -- Count matches in title
        (LENGTH(s.title) - LENGTH(REPLACE(LOWER(s.title), LOWER(?), '')))
          / LENGTH(?) as title_matches,
        -- Count matches in transcript
        (LENGTH(s.transcript_text) - LENGTH(REPLACE(LOWER(s.transcript_text), LOWER(?), '')))
          / LENGTH(?) as transcript_matches,
        -- Count matches in description
        (LENGTH(s.description) - LENGTH(REPLACE(LOWER(s.description), LOWER(?), '')))
          / LENGTH(?) as description_matches
      FROM sermons s
      WHERE s.series_id IS NOT NULL
        AND (
          s.title LIKE ? OR
          s.transcript_text LIKE ? OR
          s.description LIKE ?
        )
    )
    SELECT
      se.id,
      se.name,
      se.book,
      se.description,
      COUNT(DISTINCT sm.sermon_id) as matching_sermons,
      COUNT(s.id) as sermon_count,
      SUM(
        (sm.title_matches * 10) +
        (sm.description_matches * 5) +
        (sm.transcript_matches * 1)
      ) as relevance_score,
      SUM(sm.title_matches + sm.transcript_matches + sm.description_matches) as match_count
    FROM series se
    LEFT JOIN sermons s ON se.id = s.series_id
    LEFT JOIN sermon_matches sm ON se.id = sm.series_id
    WHERE sm.sermon_id IS NOT NULL
    GROUP BY se.id
    ORDER BY relevance_score DESC, matching_sermons DESC
    LIMIT ?
  `);

  return stmt.all(
    query, query, query, query, query, query,
    searchTerm, searchTerm, searchTerm,
    limit
  ) as SeriesSearchResult[];
}
```

#### 1.2 Create `searchSermonsWithRelevance()`
```typescript
export function searchSermonsWithRelevance(query: string, limit = 20) {
  const searchTerm = `%${query}%`;

  const stmt = db.prepare(`
    SELECT
      s.*,
      se.name as series_name,
      -- Count matches in each field
      (LENGTH(s.title) - LENGTH(REPLACE(LOWER(s.title), LOWER(?), '')))
        / LENGTH(?) as title_matches,
      (LENGTH(s.transcript_text) - LENGTH(REPLACE(LOWER(s.transcript_text), LOWER(?), '')))
        / LENGTH(?) as transcript_matches,
      (LENGTH(s.description) - LENGTH(REPLACE(LOWER(s.description), LOWER(?), '')))
        / LENGTH(?) as description_matches,
      -- Calculate weighted relevance score
      (
        ((LENGTH(s.title) - LENGTH(REPLACE(LOWER(s.title), LOWER(?), ''))) / LENGTH(?)) * 10 +
        ((LENGTH(s.description) - LENGTH(REPLACE(LOWER(s.description), LOWER(?), ''))) / LENGTH(?)) * 5 +
        ((LENGTH(s.transcript_text) - LENGTH(REPLACE(LOWER(s.transcript_text), LOWER(?), ''))) / LENGTH(?)) * 1
      ) as relevance_score
    FROM sermons s
    LEFT JOIN series se ON s.series_id = se.id
    WHERE s.title LIKE ?
       OR s.description LIKE ?
       OR s.transcript_text LIKE ?
    ORDER BY relevance_score DESC, s.date_preached DESC
    LIMIT ?
  `);

  return stmt.all(
    query, query, query, query, query, query,
    query, query, query, query, query, query,
    searchTerm, searchTerm, searchTerm,
    limit
  ) as SermonSearchResult[];
}
```

#### 1.3 Create combined `search()` function
```typescript
export function search(query: string): SearchResults {
  const series = searchSeriesWithRelevance(query, 10);
  const sermons = searchSermonsWithRelevance(query, 30);

  return {
    query,
    series,
    sermons,
    total_results: series.length + sermons.length
  };
}
```

---

### Phase 2: Update Search Page UI

#### 2.1 Update `/app/search/page.tsx`

**Current Issues:**
- Shows flat list of sermons
- No series results
- No relevance indicators

**New Structure:**
```tsx
<main className="px-4 py-4 space-y-6">
  {/* Search Bar */}
  <SearchInput defaultValue={query} />

  {query && results.total_results === 0 && (
    <EmptyState query={query} />
  )}

  {query && results.series.length > 0 && (
    <section>
      <h2>Series ({results.series.length})</h2>
      <SeriesResultsList series={results.series} />
    </section>
  )}

  {query && results.sermons.length > 0 && (
    <section>
      <h2>Sermons ({results.sermons.length})</h2>
      <SermonResultsList sermons={results.sermons} query={query} />
    </section>
  )}
</main>
```

#### 2.2 Create `SeriesResultCard` Component
```tsx
// components/search/SeriesResultCard.tsx
export default function SeriesResultCard({ series }: { series: SeriesSearchResult }) {
  return (
    <Link href={`/series/${series.id}`} className="card group">
      <div className="flex items-start gap-3">
        <BookCover title={series.name} subtitle={series.book} size="sm" />

        <div className="flex-1">
          <h3 className="font-serif font-semibold text-base mb-1">
            {series.name}
          </h3>

          <div className="flex gap-3 text-xs text-secondary mb-2">
            <span>{series.sermon_count} sermons</span>
            <span className="text-accent">
              {series.matching_sermons} match{series.matching_sermons !== 1 ? 'es' : ''}
            </span>
            <span className="opacity-60">
              {series.match_count} mentions
            </span>
          </div>

          {series.description && (
            <p className="text-sm text-secondary line-clamp-2">
              {series.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
```

#### 2.3 Create `SermonResultCard` Component
```tsx
// components/search/SermonResultCard.tsx
export default function SermonResultCard({
  sermon,
  query
}: {
  sermon: SermonSearchResult;
  query: string;
}) {
  const totalMentions = sermon.title_matches + sermon.transcript_matches;

  return (
    <Link href={`/sermons/${sermon.sermon_code}`} className="card group">
      <div className="flex items-center gap-3">
        <PlayButton sermon={sermon} size="sm" />

        <div className="flex-1">
          <h3 className="font-serif font-semibold mb-1">
            <HighlightText text={sermon.title} query={query} />
          </h3>

          <div className="flex gap-3 text-xs text-secondary">
            {sermon.series_name && <span>{sermon.series_name}</span>}
            {sermon.date_preached && (
              <span>
                {new Date(sermon.date_preached).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Relevance Indicator */}
        {totalMentions > 0 && (
          <div className="text-xs text-accent font-medium">
            {totalMentions} mention{totalMentions !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </Link>
  );
}
```

#### 2.4 Create `HighlightText` Helper
```tsx
// components/search/HighlightText.tsx
export default function HighlightText({
  text,
  query
}: {
  text: string;
  query: string;
}) {
  if (!query) return <>{text}</>;

  const regex = new RegExp(`(${query})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-accent/20 text-accent">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
```

---

### Phase 3: Testing Strategy

#### 3.1 Test Queries
- **"armor of God"** - Should find Ephesians series + individual sermons
- **"grace"** - Very common, should rank by frequency
- **"justification"** - Theological term, check relevance
- **"Romans 8"** - Book + chapter (test scripture references)

#### 3.2 Validation Checklist
- [ ] Series with most matching sermons appear first
- [ ] Sermons with term in title rank higher than body only
- [ ] Frequency counting works correctly (50 mentions > 2 mentions)
- [ ] Empty state shows when no results
- [ ] Search highlights work correctly
- [ ] Performance is acceptable (< 500ms)

---

## 🚀 Migration Path

### Step 1: Add new functions to lib/db.ts ✅
- `searchSeriesWithRelevance()`
- `searchSermonsWithRelevance()`
- `search()` (combined)

### Step 2: Update search page ✅
- Replace `searchSermons()` with `search()`
- Add series section
- Add sermons section

### Step 3: Create search components ✅
- `SeriesResultCard`
- `SermonResultCard`
- `HighlightText`

### Step 4: Test and refine ✅
- Run test queries
- Verify relevance scoring
- Optimize performance if needed

### Step 5: Optional Enhancements
- Add filters (date range, book, series only, sermons only)
- Add search suggestions/autocomplete
- Add "Did you mean?" spelling correction
- Cache common queries

---

## ⚡ Performance Considerations

### Current Search (searchSermons)
- LIKE queries on large text fields
- No indexing
- ~100-500ms for typical query

### Optimizations Needed
1. **Add indexes:**
   ```sql
   CREATE INDEX idx_sermons_title ON sermons(title);
   CREATE INDEX idx_sermons_series_id ON sermons(series_id);
   ```

2. **Limit transcript search:**
   - Only search first 10,000 characters
   - Or use FTS5 for full-text

3. **Cache popular queries:**
   - Store recent searches in memory
   - Clear every hour

---

## 🔮 Future Enhancements (Post-MVP)

### Phase 2: Advanced Features
- **Scripture reference search:** "Romans 8:28" → Find exact verse
- **Topic integration:** Search by tagged topics
- **Date filters:** "Last year" / "2020s"
- **Series-only mode:** Toggle to show only series
- **Sort options:** Relevance / Date / Duration

### Phase 3: AI-Powered Search
- **Semantic search:** "What does Paul say about faith?"
- **Question answering:** "How do I know I'm saved?"
- **Related sermons:** "Find similar to this one"

---

## 📝 Implementation Checklist

- [ ] Add new search functions to `lib/db.ts`
- [ ] Create TypeScript interfaces for search results
- [ ] Update search page to use new `search()` function
- [ ] Create `SeriesResultCard` component
- [ ] Create `SermonResultCard` component
- [ ] Create `HighlightText` component
- [ ] Add relevance indicators to UI
- [ ] Test with sample queries
- [ ] Add database indexes for performance
- [ ] Document search behavior for users

---

## 💡 Key Design Decisions

1. **Why separate Series and Sermons?**
   - User intent: Looking for comprehensive teaching vs. specific sermon
   - Better discovery: Find multi-part series easier
   - Clearer organization

2. **Why term frequency over FTS5?**
   - Simpler to implement with current setup
   - Full control over weighting
   - Can upgrade later without breaking changes

3. **Why weight title 10x higher?**
   - If topic is in title, it's the main subject
   - Prevents transcript noise (passing mention ranks low)
   - User expectation: Title should matter most

---

## 📚 Resources

- [SQLite String Functions](https://www.sqlite.org/lang_corefunc.html)
- [SQLite FTS5 Extension](https://www.sqlite.org/fts5.html) (for future)
- [Term Frequency Best Practices](https://en.wikipedia.org/wiki/Tf%E2%80%93idf)

---

**Created:** 2026-01-31
**Status:** Ready for Implementation
