import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export interface Sermon {
  id: number;
  sermon_code: string;
  title: string;
  description?: string;
  date_preached?: string;
  duration?: number;
  audio_url?: string;
  transcript_text?: string;
  series_id?: number;
  llm_metadata?: string;
  created_at: string;
  verse?: string; // primary scripture reference text
}

export interface Series {
  id: number;
  name: string;
  book?: string;
  description?: string;
}

export interface ScriptureReference {
  id: number;
  sermon_id: number;
  book: string;
  chapter: number;
  verse_start?: number;
  verse_end?: number;
  reference_text: string;
  is_primary?: boolean;
}

export interface Topic {
  id: number;
  name: string;
  category?: string;
}

// Enhanced search result types
export interface SeriesSearchResult {
  id: number;
  name: string;
  description?: string;
  sermon_count: number;
  matching_sermons: number;
  relevance_score: number;
  match_count: number;
}

export interface SermonSearchResult extends Sermon {
  relevance_score: number;
  title_matches: number;
  transcript_matches: number;
  description_matches: number;
  series_name?: string;
}

export interface SearchResults {
  query: string;
  series: SeriesSearchResult[];
  sermons: SermonSearchResult[];
  total_results: number;
  hasMoreSermons: boolean;
}

// Sort/filter options type
export interface SermonFilterOptions {
  sort?: 'date-desc' | 'date-asc' | 'title-az';
  hasTranscript?: boolean;
  sermonType?: string;    // Expository, Topical, Q&A, Biographical
  category?: string;      // Theological category like Soteriology, Christology, etc.
}

// Search-specific filter options
export interface SearchFilterOptions {
  sort?: 'relevance' | 'date-desc' | 'date-asc';
  hasTranscript?: boolean;
  sermonType?: string;
  content?: 'sermons' | 'series';  // filter to only sermons or only series
  category?: string;     // Theological category filter
  decade?: string;       // Decade filter (e.g., "1990")
  hasOutline?: boolean;  // Filter to sermons with outlines
}

// Helper: build WHERE conditions for sermon filters
function buildSermonFilterConditions(filters: { hasTranscript?: boolean; sermonType?: string; category?: string }, conditions: string[], params: any[]) {
  if (filters.hasTranscript) {
    conditions.push('s.transcript_text IS NOT NULL');
  }
  if (filters.sermonType) {
    conditions.push("json_extract(s.llm_metadata, '$.summary.sermon_type') = ?");
    params.push(filters.sermonType);
  }
  if (filters.category) {
    conditions.push(`EXISTS (
      SELECT 1 FROM json_each(json_extract(s.llm_metadata, '$.themes.theological_categories'))
      WHERE json_each.value LIKE ?
    )`);
    params.push(filters.category + '%');
  }
}

// Helper to cast libsql Row to typed object
function rowToObject<T>(row: any): T {
  return row as T;
}

function rowsToObjects<T>(rows: any[]): T[] {
  return rows as T[];
}

// Get all sermons with sort/filter support
export async function getAllSermons(limit = 50, offset = 0, filters: SermonFilterOptions = {}) {
  const conditions: string[] = ["s.title != 'Sermon Not Found'"];
  const params: any[] = [];

  buildSermonFilterConditions(filters, conditions, params);

  let orderBy = 's.date_preached DESC';
  if (filters.sort === 'date-asc') orderBy = 's.date_preached ASC';
  else if (filters.sort === 'title-az') orderBy = 's.title ASC';

  const sql = `
    SELECT s.*,
      (SELECT sr.reference_text FROM scripture_references sr
       WHERE sr.sermon_id = s.id ORDER BY sr.id LIMIT 1) as verse
    FROM sermons s
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);
  const result = await client.execute({ sql, args: params });
  return rowsToObjects<Sermon>(result.rows);
}

// Count all sermons matching filters (for result count display)
export async function countSermons(filters: SermonFilterOptions = {}): Promise<number> {
  const conditions: string[] = ["s.title != 'Sermon Not Found'"];
  const params: any[] = [];

  buildSermonFilterConditions(filters, conditions, params);

  const sql = `SELECT COUNT(*) as count FROM sermons s WHERE ${conditions.join(' AND ')}`;
  const result = await client.execute({ sql, args: params });
  return Number(result.rows[0].count);
}

// Get sermon by code
export async function getSermonByCode(code: string) {
  const result = await client.execute({
    sql: `
      SELECT s.*,
        (SELECT sr.reference_text FROM scripture_references sr
         WHERE sr.sermon_id = s.id ORDER BY sr.id LIMIT 1) as verse
      FROM sermons s WHERE s.sermon_code = ?
    `,
    args: [code],
  });
  return result.rows.length > 0 ? rowToObject<Sermon>(result.rows[0]) : undefined;
}

// Search sermons (legacy - kept for backwards compatibility)
export async function searchSermons(query: string, limit = 20) {
  const searchTerm = `%${query}%`;
  const result = await client.execute({
    sql: `
      SELECT s.*,
             (SELECT sr.reference_text FROM scripture_references sr
              WHERE sr.sermon_id = s.id ORDER BY sr.id LIMIT 1) as verse,
             CASE
               WHEN s.title LIKE ? THEN 1
               WHEN s.description LIKE ? THEN 2
               ELSE 3
             END as relevance
      FROM sermons s
      WHERE s.title LIKE ?
         OR s.description LIKE ?
         OR s.transcript_text LIKE ?
      ORDER BY relevance, date_preached DESC
      LIMIT ?
    `,
    args: [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, limit],
  });
  return rowsToObjects<Sermon>(result.rows);
}

// Enhanced search: Series with relevance scoring
export async function searchSeriesWithRelevance(query: string, limit = 10): Promise<SeriesSearchResult[]> {
  const searchTerm = `%${query}%`;
  const lowerQuery = query.toLowerCase();

  const result = await client.execute({
    sql: `
      WITH sermon_matches AS (
        SELECT
          s.series_id,
          s.id as sermon_id,
          s.title,
          s.description,
          COALESCE(s.transcript_text, '') as transcript
        FROM sermons s
        WHERE s.series_id IS NOT NULL
          AND (
            LOWER(s.title) LIKE LOWER(?)
            OR LOWER(COALESCE(s.description, '')) LIKE LOWER(?)
            OR LOWER(COALESCE(s.transcript_text, '')) LIKE LOWER(?)
          )
      )
      SELECT
        se.id,
        se.name,
        se.description,
        COUNT(DISTINCT s.id) as sermon_count,
        COUNT(DISTINCT sm.sermon_id) as matching_sermons,
        SUM(
          (LENGTH(LOWER(sm.title)) - LENGTH(REPLACE(LOWER(sm.title), ?, ''))) / LENGTH(?) +
          (LENGTH(LOWER(COALESCE(sm.description, ''))) - LENGTH(REPLACE(LOWER(COALESCE(sm.description, '')), ?, ''))) / LENGTH(?) +
          (LENGTH(LOWER(sm.transcript)) - LENGTH(REPLACE(LOWER(sm.transcript), ?, ''))) / LENGTH(?)
        ) as match_count,
        (
          CASE WHEN LOWER(se.name) LIKE LOWER(?) THEN 500 ELSE 0 END +
          SUM(
            ((LENGTH(LOWER(sm.title)) - LENGTH(REPLACE(LOWER(sm.title), ?, ''))) / LENGTH(?)) * 50 +
            ((LENGTH(LOWER(COALESCE(sm.description, ''))) - LENGTH(REPLACE(LOWER(COALESCE(sm.description, '')), ?, ''))) / LENGTH(?)) * 5 +
            ((LENGTH(LOWER(sm.transcript)) - LENGTH(REPLACE(LOWER(sm.transcript), ?, ''))) / LENGTH(?)) * 1
          )
        )
        * (1.0 + (1.0 * COUNT(DISTINCT sm.sermon_id) / MAX(COUNT(DISTINCT s.id), 1)))
        / CASE WHEN COUNT(DISTINCT s.id) > 20 THEN (1.0 + 0.5 * LOG(COUNT(DISTINCT s.id))) ELSE 1.0 END
        as relevance_score
      FROM series se
      LEFT JOIN sermons s ON se.id = s.series_id
      LEFT JOIN sermon_matches sm ON se.id = sm.series_id
      WHERE sm.sermon_id IS NOT NULL
      GROUP BY se.id
      ORDER BY relevance_score DESC, matching_sermons DESC
      LIMIT ?
    `,
    args: [
      searchTerm, searchTerm, searchTerm,
      lowerQuery, lowerQuery,
      lowerQuery, lowerQuery,
      lowerQuery, lowerQuery,
      searchTerm,
      lowerQuery, lowerQuery,
      lowerQuery, lowerQuery,
      lowerQuery, lowerQuery,
      limit
    ],
  });

  return rowsToObjects<SeriesSearchResult>(result.rows);
}

// Bible book names for scripture-aware search
const BIBLE_BOOKS_SEARCH = [
  '1 Chronicles', '2 Chronicles', '1 Corinthians', '2 Corinthians',
  '1 John', '2 John', '3 John', '1 Kings', '2 Kings',
  '1 Peter', '2 Peter', '1 Samuel', '2 Samuel',
  '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy',
  'Song of Solomon', 'Ecclesiastes', 'Lamentations',
  'Deuteronomy', 'Philippians', 'Colossians',
  'Revelation', 'Zechariah', 'Zephaniah',
  'Habakkuk', 'Nehemiah', 'Proverbs',
  'Ephesians', 'Galatians', 'Leviticus',
  'Malachi', 'Matthew', 'Genesis', 'Numbers',
  'Hebrews', 'Obadiah', 'Philemon',
  'Jeremiah', 'Isaiah', 'Daniel', 'Joshua', 'Judges',
  'Ezekiel', 'Haggai', 'Psalms', 'Psalm', 'Esther',
  'Romans', 'Exodus',
  'Micah', 'Nahum', 'Hosea', 'James',
  'Jonah', 'Amos', 'Acts', 'Ezra',
  'Mark', 'Luke', 'John', 'Joel', 'Ruth',
  'Job', 'Jude', 'Titus',
];

// Bible book abbreviation mapping (lowercase key → canonical name)
const BOOK_ABBREVIATIONS: Record<string, string> = {
  // Genesis
  'gen': 'Genesis', 'ge': 'Genesis', 'gn': 'Genesis',
  // Exodus
  'ex': 'Exodus', 'exod': 'Exodus', 'exo': 'Exodus',
  // Leviticus
  'lev': 'Leviticus', 'le': 'Leviticus', 'lv': 'Leviticus',
  // Numbers
  'num': 'Numbers', 'nu': 'Numbers', 'nm': 'Numbers', 'nb': 'Numbers',
  // Deuteronomy
  'deut': 'Deuteronomy', 'de': 'Deuteronomy', 'dt': 'Deuteronomy',
  // Joshua
  'josh': 'Joshua', 'jos': 'Joshua', 'jsh': 'Joshua',
  // Judges
  'judg': 'Judges', 'jdg': 'Judges', 'jg': 'Judges', 'jdgs': 'Judges',
  // Ruth
  'ru': 'Ruth', 'rth': 'Ruth',
  // 1 Samuel
  '1sam': '1 Samuel', '1 sam': '1 Samuel', '1sa': '1 Samuel', '1 sa': '1 Samuel', '1s': '1 Samuel',
  // 2 Samuel
  '2sam': '2 Samuel', '2 sam': '2 Samuel', '2sa': '2 Samuel', '2 sa': '2 Samuel', '2s': '2 Samuel',
  // 1 Kings
  '1kgs': '1 Kings', '1 kgs': '1 Kings', '1ki': '1 Kings', '1 ki': '1 Kings', '1k': '1 Kings',
  // 2 Kings
  '2kgs': '2 Kings', '2 kgs': '2 Kings', '2ki': '2 Kings', '2 ki': '2 Kings', '2k': '2 Kings',
  // 1 Chronicles
  '1chr': '1 Chronicles', '1 chr': '1 Chronicles', '1ch': '1 Chronicles', '1 ch': '1 Chronicles',
  // 2 Chronicles
  '2chr': '2 Chronicles', '2 chr': '2 Chronicles', '2ch': '2 Chronicles', '2 ch': '2 Chronicles',
  // Ezra
  'ezr': 'Ezra',
  // Nehemiah
  'neh': 'Nehemiah', 'ne': 'Nehemiah',
  // Esther
  'est': 'Esther', 'esth': 'Esther', 'es': 'Esther',
  // Job
  'jb': 'Job',
  // Psalms
  'ps': 'Psalms', 'psa': 'Psalms', 'psm': 'Psalms', 'pss': 'Psalms', 'psalm': 'Psalms',
  // Proverbs
  'prov': 'Proverbs', 'pro': 'Proverbs', 'prv': 'Proverbs', 'pr': 'Proverbs',
  // Ecclesiastes
  'eccl': 'Ecclesiastes', 'ecc': 'Ecclesiastes', 'ec': 'Ecclesiastes', 'qoh': 'Ecclesiastes',
  // Song of Solomon
  'song': 'Song of Solomon', 'sos': 'Song of Solomon', 'ss': 'Song of Solomon', 'canticles': 'Song of Solomon',
  // Isaiah
  'isa': 'Isaiah', 'is': 'Isaiah',
  // Jeremiah
  'jer': 'Jeremiah', 'jr': 'Jeremiah',
  // Lamentations
  'lam': 'Lamentations', 'la': 'Lamentations',
  // Ezekiel
  'ezek': 'Ezekiel', 'eze': 'Ezekiel', 'ezk': 'Ezekiel',
  // Daniel
  'dan': 'Daniel', 'da': 'Daniel', 'dn': 'Daniel',
  // Hosea
  'hos': 'Hosea', 'ho': 'Hosea',
  // Joel
  'joe': 'Joel', 'jl': 'Joel',
  // Amos
  'am': 'Amos',
  // Obadiah
  'ob': 'Obadiah', 'obad': 'Obadiah',
  // Jonah
  'jon': 'Jonah', 'jnh': 'Jonah',
  // Micah
  'mic': 'Micah', 'mi': 'Micah',
  // Nahum
  'nah': 'Nahum', 'na': 'Nahum',
  // Habakkuk
  'hab': 'Habakkuk', 'hb': 'Habakkuk',
  // Zephaniah
  'zeph': 'Zephaniah', 'zep': 'Zephaniah', 'zp': 'Zephaniah',
  // Haggai
  'hag': 'Haggai', 'hg': 'Haggai',
  // Zechariah
  'zech': 'Zechariah', 'zec': 'Zechariah', 'zc': 'Zechariah',
  // Malachi
  'mal': 'Malachi', 'ml': 'Malachi',
  // Matthew
  'matt': 'Matthew', 'mat': 'Matthew', 'mt': 'Matthew',
  // Mark
  'mk': 'Mark', 'mr': 'Mark', 'mrk': 'Mark',
  // Luke
  'lk': 'Luke', 'lu': 'Luke', 'luk': 'Luke',
  // John (Gospel)
  'jn': 'John', 'jhn': 'John', 'joh': 'John',
  // Acts
  'ac': 'Acts', 'act': 'Acts',
  // Romans
  'rom': 'Romans', 'ro': 'Romans', 'rm': 'Romans',
  // 1 Corinthians
  '1cor': '1 Corinthians', '1 cor': '1 Corinthians', '1co': '1 Corinthians', '1 co': '1 Corinthians',
  // 2 Corinthians
  '2cor': '2 Corinthians', '2 cor': '2 Corinthians', '2co': '2 Corinthians', '2 co': '2 Corinthians',
  // Galatians
  'gal': 'Galatians', 'ga': 'Galatians',
  // Ephesians
  'eph': 'Ephesians', 'ep': 'Ephesians',
  // Philippians
  'phil': 'Philippians', 'php': 'Philippians', 'pp': 'Philippians',
  // Colossians
  'col': 'Colossians',
  // 1 Thessalonians
  '1thess': '1 Thessalonians', '1 thess': '1 Thessalonians', '1th': '1 Thessalonians', '1 th': '1 Thessalonians',
  // 2 Thessalonians
  '2thess': '2 Thessalonians', '2 thess': '2 Thessalonians', '2th': '2 Thessalonians', '2 th': '2 Thessalonians',
  // 1 Timothy
  '1tim': '1 Timothy', '1 tim': '1 Timothy', '1ti': '1 Timothy', '1 ti': '1 Timothy',
  // 2 Timothy
  '2tim': '2 Timothy', '2 tim': '2 Timothy', '2ti': '2 Timothy', '2 ti': '2 Timothy',
  // Titus
  'tit': 'Titus',
  // Philemon
  'phm': 'Philemon', 'phlm': 'Philemon', 'philem': 'Philemon', 'pm': 'Philemon',
  // Hebrews
  'heb': 'Hebrews', 'he': 'Hebrews',
  // James
  'jas': 'James', 'jm': 'James', 'jam': 'James',
  // 1 Peter
  '1pet': '1 Peter', '1 pet': '1 Peter', '1pe': '1 Peter', '1 pe': '1 Peter', '1pt': '1 Peter', '1 pt': '1 Peter', '1p': '1 Peter',
  // 2 Peter
  '2pet': '2 Peter', '2 pet': '2 Peter', '2pe': '2 Peter', '2 pe': '2 Peter', '2pt': '2 Peter', '2 pt': '2 Peter', '2p': '2 Peter',
  // 1 John
  '1jn': '1 John', '1 jn': '1 John', '1jo': '1 John', '1 jo': '1 John', '1john': '1 John', '1 john': '1 John', '1j': '1 John',
  // 2 John
  '2jn': '2 John', '2 jn': '2 John', '2jo': '2 John', '2 jo': '2 John', '2john': '2 John', '2 john': '2 John', '2j': '2 John',
  // 3 John
  '3jn': '3 John', '3 jn': '3 John', '3jo': '3 John', '3 jo': '3 John', '3john': '3 John', '3 john': '3 John', '3j': '3 John',
  // Jude
  'jud': 'Jude', 'jd': 'Jude',
  // Revelation
  'rev': 'Revelation', 're': 'Revelation', 'rv': 'Revelation', 'apoc': 'Revelation',
};

// Normalize a book name: try abbreviation lookup, then match against full names
function normalizeBookName(input: string): string | null {
  const normalized = input.toLowerCase().trim();

  // Direct abbreviation lookup
  if (BOOK_ABBREVIATIONS[normalized]) {
    return BOOK_ABBREVIATIONS[normalized];
  }

  // Try exact match against full names (case-insensitive)
  for (const book of BIBLE_BOOKS_SEARCH) {
    if (book.toLowerCase() === normalized) {
      return book;
    }
  }

  return null;
}

// Detect if a search query is a scripture reference
function parseScriptureQuery(query: string): { book: string; chapter?: number; verse?: number } | null {
  const trimmed = query.trim();

  // Pattern to extract potential book name and the rest (chapter/verse)
  // Handles: "Rom", "Rom 12", "Rom 12:2", "1 Cor 13", "1Cor13:4", "Song of Solomon 2:1"
  const match = trimmed.match(/^(\d?\s*[a-zA-Z][a-zA-Z\s]*?)(?:\s+|(?=\d))(.*)$/i);

  if (!match) {
    // Try as book-only query
    const bookOnly = normalizeBookName(trimmed);
    if (bookOnly) return { book: bookOnly };
    return null;
  }

  const [, bookPart, rest] = match;
  const book = normalizeBookName(bookPart.trim());

  if (!book) return null;
  if (!rest || rest.trim() === '') return { book };

  const restTrimmed = rest.trim();

  // Parse chapter and verse from the rest
  // "chapter 12 verse 2" or "chapter 12, verse 2"
  const chapterVerseWords = restTrimmed.match(/^chapter\s+(\d+)[\s,]+verse\s+(\d+)/i);
  if (chapterVerseWords) {
    return { book, chapter: parseInt(chapterVerseWords[1]), verse: parseInt(chapterVerseWords[2]) };
  }

  // "chapter 12:2"
  const chapterColonVerse = restTrimmed.match(/^chapter\s+(\d+):(\d+)/i);
  if (chapterColonVerse) {
    return { book, chapter: parseInt(chapterColonVerse[1]), verse: parseInt(chapterColonVerse[2]) };
  }

  // "chapter 12"
  const chapterOnly = restTrimmed.match(/^chapter\s+(\d+)$/i);
  if (chapterOnly) {
    return { book, chapter: parseInt(chapterOnly[1]) };
  }

  // "12:2" or "12:2-5"
  const standardWithVerse = restTrimmed.match(/^(\d+):(\d+)/);
  if (standardWithVerse) {
    return { book, chapter: parseInt(standardWithVerse[1]), verse: parseInt(standardWithVerse[2]) };
  }

  // "12" (chapter only)
  const chapterNum = restTrimmed.match(/^(\d+)$/);
  if (chapterNum) {
    return { book, chapter: parseInt(chapterNum[1]) };
  }

  return null;
}

// Enhanced search: Sermons with relevance scoring and optional filters
export async function searchSermonsWithRelevance(query: string, limit = 30, filters: SearchFilterOptions = {}, offset = 0): Promise<SermonSearchResult[]> {
  const searchTerm = `%${query}%`;
  const lowerQuery = query.toLowerCase();

  const scriptureRef = parseScriptureQuery(query);

  const extraConditions: string[] = [];
  const extraParams: any[] = [];

  if (filters.hasTranscript) {
    extraConditions.push('s.transcript_text IS NOT NULL');
  }
  if (filters.sermonType) {
    extraConditions.push("json_extract(s.llm_metadata, '$.summary.sermon_type') = ?");
    extraParams.push(filters.sermonType);
  }
  if (filters.category) {
    extraConditions.push(`EXISTS (
      SELECT 1 FROM json_each(json_extract(s.llm_metadata, '$.themes.theological_categories'))
      WHERE json_each.value LIKE ?
    )`);
    extraParams.push(filters.category + '%');
  }
  if (filters.decade) {
    extraConditions.push("s.date_preached >= ? AND s.date_preached < ?");
    const decadeStart = filters.decade + '-01-01';
    const decadeEnd = (parseInt(filters.decade) + 10) + '-01-01';
    extraParams.push(decadeStart, decadeEnd);
  }
  if (filters.hasOutline) {
    extraConditions.push("json_extract(s.llm_metadata, '$.structure.main_points') IS NOT NULL AND json_array_length(json_extract(s.llm_metadata, '$.structure.main_points')) > 0");
  }

  const extraWhere = extraConditions.length > 0 ? ' AND ' + extraConditions.join(' AND ') : '';

  let orderBy = 'relevance_score DESC, s.date_preached DESC';
  if (filters.sort === 'date-desc') orderBy = 's.date_preached DESC';
  else if (filters.sort === 'date-asc') orderBy = 's.date_preached ASC';

  let scriptureBoostSelect = '0';
  const scriptureBoostParams: any[] = [];

  if (scriptureRef) {
    if (scriptureRef.verse && scriptureRef.chapter) {
      scriptureBoostSelect = `
        CASE
          WHEN (SELECT sr3.book FROM scripture_references sr3 WHERE sr3.sermon_id = s.id ORDER BY sr3.id LIMIT 1) = ?
               AND (SELECT sr3.chapter FROM scripture_references sr3 WHERE sr3.sermon_id = s.id ORDER BY sr3.id LIMIT 1) = ?
               AND EXISTS (SELECT 1 FROM scripture_references sr6 WHERE sr6.sermon_id = s.id
                   AND sr6.book = ? AND sr6.chapter = ?
                   AND (sr6.verse_start = ? OR (sr6.verse_start <= ? AND (sr6.verse_end IS NULL OR sr6.verse_end >= ?)))
                   ORDER BY sr6.id LIMIT 1)
          THEN 700
          WHEN (SELECT sr3.book FROM scripture_references sr3 WHERE sr3.sermon_id = s.id ORDER BY sr3.id LIMIT 1) = ?
               AND (SELECT sr3.chapter FROM scripture_references sr3 WHERE sr3.sermon_id = s.id ORDER BY sr3.id LIMIT 1) = ?
          THEN 500
          WHEN (SELECT sr3.book FROM scripture_references sr3 WHERE sr3.sermon_id = s.id ORDER BY sr3.id LIMIT 1) = ?
          THEN 200
          WHEN EXISTS (SELECT 1 FROM scripture_references sr4 WHERE sr4.sermon_id = s.id AND sr4.book = ? AND sr4.chapter = ?)
          THEN 50
          ELSE 0
        END`;
      scriptureBoostParams.push(
        scriptureRef.book, scriptureRef.chapter,
        scriptureRef.book, scriptureRef.chapter, scriptureRef.verse, scriptureRef.verse, scriptureRef.verse,
        scriptureRef.book, scriptureRef.chapter,
        scriptureRef.book,
        scriptureRef.book, scriptureRef.chapter
      );
    } else if (scriptureRef.chapter) {
      scriptureBoostSelect = `
        CASE
          WHEN (SELECT sr3.book FROM scripture_references sr3 WHERE sr3.sermon_id = s.id ORDER BY sr3.id LIMIT 1) = ?
               AND (SELECT sr3.chapter FROM scripture_references sr3 WHERE sr3.sermon_id = s.id ORDER BY sr3.id LIMIT 1) = ?
          THEN 500
          WHEN (SELECT sr3.book FROM scripture_references sr3 WHERE sr3.sermon_id = s.id ORDER BY sr3.id LIMIT 1) = ?
          THEN 200
          WHEN EXISTS (SELECT 1 FROM scripture_references sr4 WHERE sr4.sermon_id = s.id AND sr4.book = ? AND sr4.chapter = ?)
          THEN 50
          ELSE 0
        END`;
      scriptureBoostParams.push(
        scriptureRef.book, scriptureRef.chapter,
        scriptureRef.book,
        scriptureRef.book, scriptureRef.chapter
      );
    } else {
      scriptureBoostSelect = `
        CASE
          WHEN (SELECT sr3.book FROM scripture_references sr3 WHERE sr3.sermon_id = s.id ORDER BY sr3.id LIMIT 1) = ?
          THEN 500
          WHEN EXISTS (SELECT 1 FROM scripture_references sr4 WHERE sr4.sermon_id = s.id AND sr4.book = ?)
          THEN 50
          ELSE 0
        END`;
      scriptureBoostParams.push(
        scriptureRef.book,
        scriptureRef.book
      );
    }
  }

  const whereScriptureParams: any[] = [];
  if (scriptureRef) {
    whereScriptureParams.push(scriptureRef.book);
    if (scriptureRef.chapter) whereScriptureParams.push(scriptureRef.chapter);
  }

  const sql = `
    SELECT
      s.*,
      (SELECT sr.reference_text FROM scripture_references sr
       WHERE sr.sermon_id = s.id ORDER BY sr.id LIMIT 1) as verse,
      se.name as series_name,
      (LENGTH(LOWER(s.title)) - LENGTH(REPLACE(LOWER(s.title), ?, ''))) / LENGTH(?) as title_matches,
      (LENGTH(LOWER(COALESCE(s.description, ''))) - LENGTH(REPLACE(LOWER(COALESCE(s.description, '')), ?, ''))) / LENGTH(?) as description_matches,
      (LENGTH(LOWER(COALESCE(s.transcript_text, ''))) - LENGTH(REPLACE(LOWER(COALESCE(s.transcript_text, '')), ?, ''))) / LENGTH(?) as transcript_matches,
      (
        ((LENGTH(LOWER(s.title)) - LENGTH(REPLACE(LOWER(s.title), ?, ''))) / LENGTH(?)) * 50 +
        ((LENGTH(LOWER(COALESCE(s.description, ''))) - LENGTH(REPLACE(LOWER(COALESCE(s.description, '')), ?, ''))) / LENGTH(?)) * 5 +
        ((LENGTH(LOWER(COALESCE(s.transcript_text, ''))) - LENGTH(REPLACE(LOWER(COALESCE(s.transcript_text, '')), ?, ''))) / LENGTH(?)) * 1 +
        (${scriptureBoostSelect})
      ) as relevance_score
    FROM sermons s
    LEFT JOIN series se ON s.series_id = se.id
    WHERE (LOWER(s.title) LIKE LOWER(?)
       OR LOWER(COALESCE(s.description, '')) LIKE LOWER(?)
       OR LOWER(COALESCE(s.transcript_text, '')) LIKE LOWER(?)
       ${scriptureRef ? `OR EXISTS (SELECT 1 FROM scripture_references sr5 WHERE sr5.sermon_id = s.id AND sr5.book = ?${scriptureRef.chapter ? ' AND sr5.chapter = ?' : ''})` : ''})
    ${extraWhere}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const args = [
    lowerQuery, lowerQuery,
    lowerQuery, lowerQuery,
    lowerQuery, lowerQuery,
    lowerQuery, lowerQuery,
    lowerQuery, lowerQuery,
    lowerQuery, lowerQuery,
    ...scriptureBoostParams,
    searchTerm, searchTerm, searchTerm,
    ...whereScriptureParams,
    ...extraParams,
    limit,
    offset
  ];

  const result = await client.execute({ sql, args });
  return rowsToObjects<SermonSearchResult>(result.rows);
}

// Combined enhanced search function with optional filters
export async function search(query: string, filters: SearchFilterOptions = {}, sermonOffset = 0): Promise<SearchResults> {
  if (!query || query.trim().length === 0) {
    return {
      query: '',
      series: [],
      sermons: [],
      total_results: 0,
      hasMoreSermons: false,
    };
  }

  const SERMON_LIMIT = 50;
  const series = (filters.content === 'sermons' || sermonOffset > 0) ? [] : await searchSeriesWithRelevance(query, 10);
  const sermons = filters.content === 'series' ? [] : await searchSermonsWithRelevance(query, SERMON_LIMIT + 1, filters, sermonOffset);
  const hasMoreSermons = sermons.length > SERMON_LIMIT;
  const displaySermons = hasMoreSermons ? sermons.slice(0, SERMON_LIMIT) : sermons;

  return {
    query,
    series,
    sermons: displaySermons,
    total_results: series.length + displaySermons.length,
    hasMoreSermons,
  };
}

// Scripture filter options
export interface ScriptureFilterOptions {
  sort?: 'date-desc' | 'date-asc' | 'verse';
  hasTranscript?: boolean;
}

// Get sermons by scripture reference with optional filters
export async function getSermonsByScripture(book: string, chapter?: number, verse?: number, limit = 50, filters: ScriptureFilterOptions = {}) {
  const conditionParams: any[] = [book];
  let conditions = 'sr.book = ?';

  if (chapter !== undefined) {
    conditions += ' AND sr.chapter = ?';
    conditionParams.push(chapter);
  }

  if (verse !== undefined) {
    conditions += ' AND sr.verse_start <= ? AND (sr.verse_end >= ? OR sr.verse_end IS NULL)';
    conditionParams.push(verse, verse);
  }

  if (filters.hasTranscript) {
    conditions += ' AND s.transcript_text IS NOT NULL';
  }

  conditions += ' AND (SELECT sr3.book FROM scripture_references sr3 WHERE sr3.sermon_id = s.id ORDER BY sr3.id LIMIT 1) = ?';
  conditionParams.push(book);

  let orderBy = 's.date_preached DESC';
  if (filters.sort === 'date-asc') orderBy = 's.date_preached ASC';
  else if (filters.sort === 'verse') orderBy = 'MIN(sr.verse_start) ASC, s.date_preached ASC';

  const allParams = [...conditionParams, limit];

  const sql = `
    SELECT s.*,
      (SELECT sr2.reference_text FROM scripture_references sr2
       WHERE sr2.sermon_id = s.id ORDER BY sr2.id LIMIT 1) as verse,
      MIN(sr.verse_start) as sort_verse
    FROM sermons s
    JOIN scripture_references sr ON s.id = sr.sermon_id
    WHERE ${conditions}
    GROUP BY s.id
    ORDER BY ${orderBy}
    LIMIT ?
  `;

  const result = await client.execute({ sql, args: allParams });
  return rowsToObjects<Sermon>(result.rows);
}

// Get sermons that REFERENCE a chapter but whose primary book is different
export async function getReferencingSermons(book: string, chapter: number, limit = 5, offset = 0) {
  const sql = `
    SELECT s.*,
      (SELECT sr2.reference_text FROM scripture_references sr2
       WHERE sr2.sermon_id = s.id ORDER BY sr2.id LIMIT 1) as verse,
      COUNT(sr.id) as ref_count
    FROM sermons s
    JOIN scripture_references sr ON s.id = sr.sermon_id
    WHERE sr.book = ? AND sr.chapter = ?
      AND (SELECT sr3.book FROM scripture_references sr3
           WHERE sr3.sermon_id = s.id ORDER BY sr3.id LIMIT 1) != ?
    GROUP BY s.id
    ORDER BY ref_count DESC, s.date_preached DESC
    LIMIT ? OFFSET ?
  `;
  const result = await client.execute({ sql, args: [book, chapter, book, limit + 1, offset] });
  return rowsToObjects<Sermon & { ref_count: number }>(result.rows);
}

// Get all books with sermon counts
export async function getAllBooks() {
  const result = await client.execute({
    sql: `
      WITH primary_refs AS (
        SELECT
          s.id as sermon_id,
          (SELECT sr2.book FROM scripture_references sr2
           WHERE sr2.sermon_id = s.id ORDER BY sr2.id LIMIT 1) as primary_book
        FROM sermons s
      )
      SELECT
        pr.primary_book as book,
        COUNT(*) as sermon_count
      FROM primary_refs pr
      WHERE pr.primary_book IS NOT NULL
      GROUP BY pr.primary_book
      ORDER BY sermon_count DESC
    `,
    args: [],
  });
  return rowsToObjects<{ book: string; sermon_count: number }>(result.rows);
}

// Get chapters for a book
export async function getChaptersForBook(book: string) {
  const result = await client.execute({
    sql: `
      SELECT
        sr.chapter,
        COUNT(DISTINCT CASE
          WHEN (SELECT sr2.book FROM scripture_references sr2 WHERE sr2.sermon_id = s.id ORDER BY sr2.id LIMIT 1) = ?
          THEN s.id END) as sermon_count,
        COUNT(DISTINCT s.id) as total_count
      FROM scripture_references sr
      JOIN sermons s ON sr.sermon_id = s.id
      WHERE sr.book = ? AND sr.chapter IS NOT NULL
      GROUP BY sr.chapter
      ORDER BY CAST(sr.chapter AS INTEGER)
    `,
    args: [book, book],
  });
  return rowsToObjects<{ chapter: number; sermon_count: number; total_count: number }>(result.rows);
}

// Get all series with sermon counts
export async function getAllSeries() {
  const result = await client.execute({
    sql: `
      SELECT
        se.*,
        COUNT(s.id) as sermon_count,
        MIN(s.date_preached) as first_sermon_date,
        MAX(s.date_preached) as last_sermon_date
      FROM series se
      LEFT JOIN sermons s ON se.id = s.series_id
      GROUP BY se.id
      ORDER BY sermon_count DESC
    `,
    args: [],
  });
  return rowsToObjects<Series & {
    sermon_count: number;
    first_sermon_date?: string;
    last_sermon_date?: string;
  }>(result.rows);
}

// Get primary scripture ranges for multiple series at once (avoids N+1 queries)
export async function getSeriesScriptureRanges(seriesIds: number[]): Promise<Record<number, string>> {
  if (seriesIds.length === 0) return {};
  const placeholders = seriesIds.map(() => '?').join(',');
  const result = await client.execute({
    sql: `
      WITH primary_book AS (
        SELECT
          s.series_id,
          sr.book,
          COUNT(*) as cnt,
          ROW_NUMBER() OVER (PARTITION BY s.series_id ORDER BY COUNT(*) DESC) as rn
        FROM sermons s
        JOIN scripture_references sr ON s.id = sr.sermon_id
        WHERE s.series_id IN (${placeholders})
        GROUP BY s.series_id, sr.book
      ),
      chapter_counts AS (
        SELECT
          s.series_id,
          sr.chapter,
          COUNT(*) as ch_cnt
        FROM sermons s
        JOIN scripture_references sr ON s.id = sr.sermon_id
        JOIN primary_book pb ON pb.series_id = s.series_id AND pb.book = sr.book AND pb.rn = 1
        WHERE s.series_id IN (${placeholders})
        GROUP BY s.series_id, sr.chapter
      ),
      filtered_chapters AS (
        SELECT
          cc.series_id,
          cc.chapter,
          cc.ch_cnt
        FROM chapter_counts cc
        WHERE cc.ch_cnt >= (
          SELECT MAX(cc2.ch_cnt) * 0.5 FROM chapter_counts cc2 WHERE cc2.series_id = cc.series_id
        )
      )
      SELECT
        pb.series_id,
        pb.book,
        MIN(fc.chapter) as min_ch,
        MAX(fc.chapter) as max_ch
      FROM primary_book pb
      LEFT JOIN filtered_chapters fc ON fc.series_id = pb.series_id
      WHERE pb.rn = 1
      GROUP BY pb.series_id, pb.book
    `,
    args: [...seriesIds, ...seriesIds],
  });

  const resultMap: Record<number, string> = {};
  for (const row of result.rows) {
    const seriesId = Number(row.series_id);
    const book = String(row.book);
    const minCh = row.min_ch ? Number(row.min_ch) : null;
    const maxCh = row.max_ch ? Number(row.max_ch) : null;
    if (minCh && maxCh && minCh !== maxCh) {
      resultMap[seriesId] = `${book} ${minCh}–${maxCh}`;
    } else if (minCh) {
      resultMap[seriesId] = `${book} ${minCh}`;
    } else {
      resultMap[seriesId] = book;
    }
  }
  return resultMap;
}

// Get the primary scripture range for a series
export async function getSeriesScriptureRange(seriesId: number): Promise<string | null> {
  const ranges = await getSeriesScriptureRanges([seriesId]);
  return ranges[seriesId] || null;
}

// Study-by-book sort options
export interface StudyByBookFilterOptions {
  sort?: 'date' | 'sermons' | 'name-az';
}

// Get series by book (for "Study by Book" feature) with optional sort
export async function getSeriesByBook(book: string, filters: StudyByBookFilterOptions = {}) {
  let orderBy = 'first_sermon_date';
  if (filters.sort === 'sermons') orderBy = 'sermon_count DESC';
  else if (filters.sort === 'name-az') orderBy = 'se.name ASC';

  const result = await client.execute({
    sql: `
      WITH series_book_refs AS (
        SELECT
          se.id as series_id,
          sr.book,
          COUNT(*) as ref_count,
          SUM(COUNT(*)) OVER (PARTITION BY se.id) as total_refs,
          ROW_NUMBER() OVER (PARTITION BY se.id ORDER BY COUNT(*) DESC) as rn
        FROM series se
        JOIN sermons s ON se.id = s.series_id
        JOIN scripture_references sr ON s.id = sr.sermon_id
        GROUP BY se.id, sr.book
      )
      SELECT
        se.*,
        COUNT(DISTINCT s.id) as sermon_count,
        MIN(s.date_preached) as first_sermon_date,
        MAX(s.date_preached) as last_sermon_date
      FROM series se
      JOIN series_book_refs sbr ON se.id = sbr.series_id
      LEFT JOIN sermons s ON se.id = s.series_id
      WHERE sbr.book = ?
        AND sbr.rn = 1
      GROUP BY se.id
      ORDER BY ${orderBy}
    `,
    args: [book],
  });
  return rowsToObjects<Series & {
    sermon_count: number;
    first_sermon_date?: string;
    last_sermon_date?: string;
  }>(result.rows);
}

// Get books with sermon counts (for "Study by Book" page)
export async function getBooksWithSeriesCounts() {
  const result = await client.execute({
    sql: `
      WITH primary_refs AS (
        SELECT
          s.id as sermon_id,
          s.series_id,
          (SELECT sr2.book FROM scripture_references sr2
           WHERE sr2.sermon_id = s.id ORDER BY sr2.id LIMIT 1) as primary_book
        FROM sermons s
      ),
      series_book_refs AS (
        SELECT
          se.id as series_id,
          sr.book,
          COUNT(*) as ref_count,
          SUM(COUNT(*)) OVER (PARTITION BY se.id) as total_refs,
          ROW_NUMBER() OVER (PARTITION BY se.id ORDER BY COUNT(*) DESC) as rn
        FROM series se
        JOIN sermons s ON se.id = s.series_id
        JOIN scripture_references sr ON s.id = sr.sermon_id
        GROUP BY se.id, sr.book
      )
      SELECT
        pr.primary_book as book,
        COUNT(DISTINCT pr.sermon_id) as sermon_count,
        COUNT(DISTINCT sbr.series_id) as series_count
      FROM primary_refs pr
      LEFT JOIN series_book_refs sbr
        ON pr.series_id = sbr.series_id
        AND sbr.book = pr.primary_book
        AND (sbr.rn = 1 OR (1.0 * sbr.ref_count / sbr.total_refs) >= 0.25)
      WHERE pr.primary_book IS NOT NULL
      GROUP BY pr.primary_book
      ORDER BY sermon_count DESC
    `,
    args: [],
  });
  return rowsToObjects<{ book: string; series_count: number; sermon_count: number }>(result.rows);
}

// Series detail filter options
export interface SeriesDetailFilterOptions {
  sort?: 'series-order' | 'newest' | 'verse';
  hasTranscript?: boolean;
}

// Get sermons for a series with optional filters
export async function getSermonsBySeries(seriesId: number, filters: SeriesDetailFilterOptions = {}) {
  const conditions: string[] = ['s.series_id = ?'];
  const params: any[] = [seriesId];

  if (filters.hasTranscript) {
    conditions.push('s.transcript_text IS NOT NULL');
  }

  let orderBy = 's.date_preached ASC';
  if (filters.sort === 'newest') orderBy = 's.date_preached DESC';
  else if (filters.sort === 'verse') orderBy = 'primary_chapter ASC, primary_verse ASC, s.date_preached ASC';

  const sql = `
    SELECT s.*,
      (SELECT sr2.reference_text FROM scripture_references sr2
       WHERE sr2.sermon_id = s.id ORDER BY sr2.id LIMIT 1) as verse,
      (SELECT sr3.chapter FROM scripture_references sr3
       WHERE sr3.sermon_id = s.id ORDER BY sr3.id LIMIT 1) as primary_chapter,
      (SELECT sr4.verse_start FROM scripture_references sr4
       WHERE sr4.sermon_id = s.id ORDER BY sr4.id LIMIT 1) as primary_verse
    FROM sermons s
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${orderBy}
  `;

  const result = await client.execute({ sql, args: params });
  return rowsToObjects<Sermon>(result.rows);
}

// Get series by ID
export async function getSeriesById(id: number) {
  const result = await client.execute({
    sql: 'SELECT * FROM series WHERE id = ?',
    args: [id],
  });
  return result.rows.length > 0 ? rowToObject<Series>(result.rows[0]) : undefined;
}

// Get all topics with sermon counts
export async function getAllTopics() {
  const result = await client.execute({
    sql: `
      SELECT
        t.*,
        COUNT(st.sermon_id) as sermon_count
      FROM topics t
      LEFT JOIN sermon_topics st ON t.id = st.topic_id
      GROUP BY t.id
      ORDER BY LOWER(t.name) ASC
    `,
    args: [],
  });
  return rowsToObjects<Topic & { sermon_count: number }>(result.rows);
}

// Get sermons by topic with optional filters
export async function getSermonsByTopic(topicId: number, limit = 50, offset = 0, filters: SermonFilterOptions = {}) {
  const conditions: string[] = ['st.topic_id = ?'];
  const params: any[] = [topicId];

  buildSermonFilterConditions(filters, conditions, params);

  let orderBy = 's.date_preached DESC';
  if (filters.sort === 'date-asc') orderBy = 's.date_preached ASC';
  else if (filters.sort === 'title-az') orderBy = 's.title ASC';

  const sql = `
    SELECT s.*,
      (SELECT sr.reference_text FROM scripture_references sr
       WHERE sr.sermon_id = s.id ORDER BY sr.id LIMIT 1) as verse
    FROM sermons s
    JOIN sermon_topics st ON s.id = st.sermon_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);
  const result = await client.execute({ sql, args: params });
  return rowsToObjects<Sermon>(result.rows);
}

// Count sermons by topic matching filters
export async function countSermonsByTopic(topicId: number, filters: SermonFilterOptions = {}): Promise<number> {
  const conditions: string[] = ['st.topic_id = ?'];
  const params: any[] = [topicId];

  buildSermonFilterConditions(filters, conditions, params);

  const sql = `SELECT COUNT(*) as count FROM sermons s JOIN sermon_topics st ON s.id = st.sermon_id WHERE ${conditions.join(' AND ')}`;
  const result = await client.execute({ sql, args: params });
  return Number(result.rows[0].count);
}

// Get topics for a sermon
export async function getTopicsForSermon(sermonId: number) {
  const result = await client.execute({
    sql: `
      SELECT t.*
      FROM topics t
      JOIN sermon_topics st ON t.id = st.topic_id
      WHERE st.sermon_id = ?
    `,
    args: [sermonId],
  });
  return rowsToObjects<Topic>(result.rows);
}

// Get scripture references for a sermon
export async function getScriptureReferencesForSermon(sermonId: number) {
  const result = await client.execute({
    sql: `
      SELECT * FROM scripture_references
      WHERE sermon_id = ?
      ORDER BY book, chapter, verse_start
    `,
    args: [sermonId],
  });
  return rowsToObjects<ScriptureReference>(result.rows);
}

// Get adjacent sermons in a series (prev/next)
export async function getAdjacentSermonsInSeries(seriesId: number, currentSermonDate: string): Promise<{ prev?: Sermon; next?: Sermon }> {
  const [prevResult, nextResult] = await Promise.all([
    client.execute({
      sql: `
        SELECT s.*,
          (SELECT sr.reference_text FROM scripture_references sr
           WHERE sr.sermon_id = s.id ORDER BY sr.id LIMIT 1) as verse
        FROM sermons s
        WHERE s.series_id = ? AND s.date_preached < ?
        ORDER BY s.date_preached DESC
        LIMIT 1
      `,
      args: [seriesId, currentSermonDate],
    }),
    client.execute({
      sql: `
        SELECT s.*,
          (SELECT sr.reference_text FROM scripture_references sr
           WHERE sr.sermon_id = s.id ORDER BY sr.id LIMIT 1) as verse
        FROM sermons s
        WHERE s.series_id = ? AND s.date_preached > ?
        ORDER BY s.date_preached ASC
        LIMIT 1
      `,
      args: [seriesId, currentSermonDate],
    }),
  ]);

  const prev = prevResult.rows.length > 0 ? rowToObject<Sermon>(prevResult.rows[0]) : undefined;
  const next = nextResult.rows.length > 0 ? rowToObject<Sermon>(nextResult.rows[0]) : undefined;
  return { prev, next };
}

// Get related sermons based on shared themes/topics/scripture
export async function getRelatedSermons(sermonId: number, primaryTheme: string | null, scriptureBook: string | null, limit = 5): Promise<Sermon[]> {
  if (scriptureBook) {
    const byBook = await client.execute({
      sql: `
        SELECT s.*,
          (SELECT sr.reference_text FROM scripture_references sr
           WHERE sr.sermon_id = s.id ORDER BY sr.id LIMIT 1) as verse
        FROM sermons s
        WHERE s.id != ?
          AND s.title != 'Sermon Not Found'
          AND EXISTS (
            SELECT 1 FROM scripture_references sr
            WHERE sr.sermon_id = s.id AND sr.book = ?
            AND sr.id = (SELECT MIN(sr2.id) FROM scripture_references sr2 WHERE sr2.sermon_id = s.id)
          )
        ORDER BY s.date_preached DESC
        LIMIT ?
      `,
      args: [sermonId, scriptureBook, limit],
    });
    if (byBook.rows.length > 0) return rowsToObjects<Sermon>(byBook.rows);
  }

  if (primaryTheme) {
    const byTheme = await client.execute({
      sql: `
        SELECT s.*,
          (SELECT sr.reference_text FROM scripture_references sr
           WHERE sr.sermon_id = s.id ORDER BY sr.id LIMIT 1) as verse
        FROM sermons s
        WHERE s.id != ?
          AND s.title != 'Sermon Not Found'
          AND json_extract(s.llm_metadata, '$.themes.primary') = ?
        ORDER BY s.date_preached DESC
        LIMIT ?
      `,
      args: [sermonId, primaryTheme, limit],
    });
    if (byTheme.rows.length > 0) return rowsToObjects<Sermon>(byTheme.rows);
  }

  return [];
}

// Get database stats
export async function getStats() {
  const [totalSermons, withTranscripts, withMetadata, totalSeries, totalTopics, totalScriptureRefs] = await Promise.all([
    client.execute({ sql: 'SELECT COUNT(*) as count FROM sermons', args: [] }),
    client.execute({ sql: 'SELECT COUNT(*) as count FROM sermons WHERE transcript_text IS NOT NULL', args: [] }),
    client.execute({ sql: 'SELECT COUNT(*) as count FROM sermons WHERE llm_metadata IS NOT NULL', args: [] }),
    client.execute({ sql: 'SELECT COUNT(*) as count FROM series', args: [] }),
    client.execute({ sql: 'SELECT COUNT(*) as count FROM topics', args: [] }),
    client.execute({ sql: 'SELECT COUNT(*) as count FROM scripture_references', args: [] }),
  ]);

  return {
    totalSermons: Number(totalSermons.rows[0].count),
    withTranscripts: Number(withTranscripts.rows[0].count),
    withMetadata: Number(withMetadata.rows[0].count),
    totalSeries: Number(totalSeries.rows[0].count),
    totalTopics: Number(totalTopics.rows[0].count),
    totalScriptureRefs: Number(totalScriptureRefs.rows[0].count),
  };
}

// ============================================================
// Metadata browsing functions (generic across all dimensions)
// ============================================================

export interface MetadataValue {
  value: string;
  sermon_count: number;
}

export interface MetadataQueryOptions {
  limit?: number;
  offset?: number;
  search?: string;
  minCount?: number;
  extractKey?: string;
  scalar?: boolean;
}

export async function getMetadataValues(
  jsonPath: string,
  options: MetadataQueryOptions = {}
): Promise<MetadataValue[]> {
  const { limit = 100, offset = 0, search, minCount, extractKey, scalar } = options;

  const params: any[] = [];
  let sql: string;

  if (scalar) {
    sql = `
      SELECT
        json_extract(s.llm_metadata, ?) as value,
        COUNT(*) as sermon_count
      FROM sermons s
      WHERE s.llm_metadata IS NOT NULL
        AND json_extract(s.llm_metadata, ?) IS NOT NULL
        AND TRIM(json_extract(s.llm_metadata, ?)) != ''
    `;
    params.push(jsonPath, jsonPath, jsonPath);

    if (search) {
      sql += ` AND LOWER(json_extract(s.llm_metadata, ?)) LIKE LOWER(?)`;
      params.push(jsonPath, `%${search}%`);
    }

    sql += ` GROUP BY LOWER(TRIM(value))`;

    if (minCount) {
      sql += ` HAVING sermon_count >= ?`;
      params.push(minCount);
    }

    sql += ` ORDER BY sermon_count DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

  } else if (extractKey) {
    sql = `
      SELECT
        TRIM(json_extract(json_each.value, ?)) as value,
        COUNT(DISTINCT s.id) as sermon_count
      FROM sermons s, json_each(json_extract(s.llm_metadata, ?))
      WHERE s.llm_metadata IS NOT NULL
        AND json_extract(s.llm_metadata, ?) IS NOT NULL
        AND json_extract(json_each.value, ?) IS NOT NULL
        AND TRIM(json_extract(json_each.value, ?)) != ''
    `;
    params.push(extractKey, jsonPath, jsonPath, extractKey, extractKey);

    if (search) {
      sql += ` AND LOWER(TRIM(json_extract(json_each.value, ?))) LIKE LOWER(?)`;
      params.push(extractKey, `%${search}%`);
    }

    sql += ` GROUP BY LOWER(TRIM(json_extract(json_each.value, ?)))`;
    params.push(extractKey);

    if (minCount) {
      sql += ` HAVING sermon_count >= ?`;
      params.push(minCount);
    }

    sql += ` ORDER BY sermon_count DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

  } else {
    sql = `
      SELECT
        TRIM(json_each.value) as value,
        COUNT(DISTINCT s.id) as sermon_count
      FROM sermons s, json_each(json_extract(s.llm_metadata, ?))
      WHERE s.llm_metadata IS NOT NULL
        AND json_extract(s.llm_metadata, ?) IS NOT NULL
        AND TRIM(json_each.value) != ''
    `;
    params.push(jsonPath, jsonPath);

    if (search) {
      sql += ` AND LOWER(TRIM(json_each.value)) LIKE LOWER(?)`;
      params.push(`%${search}%`);
    }

    sql += ` GROUP BY LOWER(TRIM(json_each.value))`;

    if (minCount) {
      sql += ` HAVING sermon_count >= ?`;
      params.push(minCount);
    }

    sql += ` ORDER BY sermon_count DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
  }

  const result = await client.execute({ sql, args: params });
  return rowsToObjects<MetadataValue>(result.rows);
}

export async function countMetadataValues(
  jsonPath: string,
  options: { extractKey?: string; scalar?: boolean; search?: string } = {}
): Promise<number> {
  const { extractKey, scalar, search } = options;
  const params: any[] = [];
  let sql: string;

  if (scalar) {
    sql = `
      SELECT COUNT(DISTINCT LOWER(TRIM(json_extract(s.llm_metadata, ?)))) as cnt
      FROM sermons s
      WHERE s.llm_metadata IS NOT NULL
        AND json_extract(s.llm_metadata, ?) IS NOT NULL
        AND TRIM(json_extract(s.llm_metadata, ?)) != ''
    `;
    params.push(jsonPath, jsonPath, jsonPath);
    if (search) {
      sql += ` AND LOWER(json_extract(s.llm_metadata, ?)) LIKE LOWER(?)`;
      params.push(jsonPath, `%${search}%`);
    }
  } else if (extractKey) {
    sql = `
      SELECT COUNT(DISTINCT LOWER(TRIM(json_extract(json_each.value, ?)))) as cnt
      FROM sermons s, json_each(json_extract(s.llm_metadata, ?))
      WHERE s.llm_metadata IS NOT NULL
        AND json_extract(s.llm_metadata, ?) IS NOT NULL
        AND json_extract(json_each.value, ?) IS NOT NULL
        AND TRIM(json_extract(json_each.value, ?)) != ''
    `;
    params.push(extractKey, jsonPath, jsonPath, extractKey, extractKey);
    if (search) {
      sql += ` AND LOWER(TRIM(json_extract(json_each.value, ?))) LIKE LOWER(?)`;
      params.push(extractKey, `%${search}%`);
    }
  } else {
    sql = `
      SELECT COUNT(DISTINCT LOWER(TRIM(json_each.value))) as cnt
      FROM sermons s, json_each(json_extract(s.llm_metadata, ?))
      WHERE s.llm_metadata IS NOT NULL
        AND json_extract(s.llm_metadata, ?) IS NOT NULL
        AND TRIM(json_each.value) != ''
    `;
    params.push(jsonPath, jsonPath);
    if (search) {
      sql += ` AND LOWER(TRIM(json_each.value)) LIKE LOWER(?)`;
      params.push(`%${search}%`);
    }
  }

  const result = await client.execute({ sql, args: params });
  return Number(result.rows[0].cnt);
}

// ============================================================
// Cached metadata functions (use pre-computed metadata_cache table)
// ============================================================

export async function getCachedMetadataValues(
  dimension: string,
  options: { limit?: number; offset?: number; search?: string } = {}
): Promise<MetadataValue[]> {
  const { limit = 100, offset = 0, search } = options;
  const params: any[] = [dimension];
  let sql = `SELECT value, sermon_count FROM metadata_cache WHERE dimension = ?`;

  if (search) {
    sql += ` AND LOWER(value) LIKE LOWER(?)`;
    params.push(`%${search}%`);
  }

  sql += ` ORDER BY sermon_count DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = await client.execute({ sql, args: params });
  return rowsToObjects<MetadataValue>(result.rows);
}

export async function countCachedMetadataValues(
  dimension: string,
  search?: string
): Promise<number> {
  const params: any[] = [dimension];
  let sql = `SELECT COUNT(*) as cnt FROM metadata_cache WHERE dimension = ?`;

  if (search) {
    sql += ` AND LOWER(value) LIKE LOWER(?)`;
    params.push(`%${search}%`);
  }

  const result = await client.execute({ sql, args: params });
  return Number(result.rows[0].cnt);
}

export async function getSermonsByMetadata(
  jsonPath: string,
  value: string,
  options: {
    limit?: number;
    offset?: number;
    sort?: 'date-desc' | 'date-asc' | 'title-az';
    extractKey?: string;
    scalar?: boolean;
    hasTranscript?: boolean;
  } = {}
): Promise<Sermon[]> {
  const { limit = 20, offset = 0, sort = 'date-desc', extractKey, scalar, hasTranscript } = options;
  const params: any[] = [];

  let whereClause: string;

  if (scalar) {
    whereClause = `LOWER(TRIM(json_extract(s.llm_metadata, ?))) = LOWER(?)`;
    params.push(jsonPath, value);
  } else if (extractKey) {
    whereClause = `EXISTS (
      SELECT 1 FROM json_each(json_extract(s.llm_metadata, ?))
      WHERE LOWER(TRIM(json_extract(json_each.value, ?))) = LOWER(?)
    )`;
    params.push(jsonPath, extractKey, value);
  } else {
    whereClause = `EXISTS (
      SELECT 1 FROM json_each(json_extract(s.llm_metadata, ?))
      WHERE LOWER(TRIM(json_each.value)) = LOWER(?)
    )`;
    params.push(jsonPath, value);
  }

  let extraWhere = '';
  if (hasTranscript) {
    extraWhere += ' AND s.transcript_text IS NOT NULL';
  }

  let orderBy = 's.date_preached DESC';
  if (sort === 'date-asc') orderBy = 's.date_preached ASC';
  else if (sort === 'title-az') orderBy = 's.title ASC';

  const sql = `
    SELECT s.*,
      (SELECT sr.reference_text FROM scripture_references sr
       WHERE sr.sermon_id = s.id ORDER BY sr.id LIMIT 1) as verse
    FROM sermons s
    WHERE s.llm_metadata IS NOT NULL
      AND ${whereClause}
      ${extraWhere}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);
  const result = await client.execute({ sql, args: params });
  return rowsToObjects<Sermon>(result.rows);
}

export async function countSermonsByMetadata(
  jsonPath: string,
  value: string,
  options: { extractKey?: string; scalar?: boolean; hasTranscript?: boolean } = {}
): Promise<number> {
  const { extractKey, scalar, hasTranscript } = options;
  const params: any[] = [];

  let whereClause: string;

  if (scalar) {
    whereClause = `LOWER(TRIM(json_extract(s.llm_metadata, ?))) = LOWER(?)`;
    params.push(jsonPath, value);
  } else if (extractKey) {
    whereClause = `EXISTS (
      SELECT 1 FROM json_each(json_extract(s.llm_metadata, ?))
      WHERE LOWER(TRIM(json_extract(json_each.value, ?))) = LOWER(?)
    )`;
    params.push(jsonPath, extractKey, value);
  } else {
    whereClause = `EXISTS (
      SELECT 1 FROM json_each(json_extract(s.llm_metadata, ?))
      WHERE LOWER(TRIM(json_each.value)) = LOWER(?)
    )`;
    params.push(jsonPath, value);
  }

  let extraWhere = '';
  if (hasTranscript) {
    extraWhere += ' AND s.transcript_text IS NOT NULL';
  }

  const sql = `
    SELECT COUNT(*) as cnt
    FROM sermons s
    WHERE s.llm_metadata IS NOT NULL
      AND ${whereClause}
      ${extraWhere}
  `;

  const result = await client.execute({ sql, args: params });
  return Number(result.rows[0].cnt);
}

// Transcript-focused search — returns sermons with matching transcript content
export interface TranscriptSearchRow {
  id: number;
  sermon_code: string;
  title: string;
  audio_url?: string;
  date_preached?: string;
  verse?: string;
  series_name?: string;
  transcript_text?: string;
  transcript_matches: number;
}

export async function searchTranscripts(
  query: string,
  limit = 30,
  offset = 0
): Promise<TranscriptSearchRow[]> {
  // Check if query is a scripture reference - if so, expand abbreviations
  // e.g., "Rom 12:2" → search for "Romans 12" in transcripts
  const scriptureRef = parseScriptureQuery(query);
  let searchQuery = query;

  if (scriptureRef) {
    // Build expanded search term with full book name
    searchQuery = scriptureRef.book;
    if (scriptureRef.chapter) {
      searchQuery += ` ${scriptureRef.chapter}`;
    }
  }

  const searchTerm = `%${searchQuery}%`;
  const lowerQuery = searchQuery.toLowerCase();

  const sql = `
    SELECT
      s.id,
      s.sermon_code,
      s.title,
      s.audio_url,
      s.date_preached,
      s.transcript_text,
      (SELECT sr.reference_text FROM scripture_references sr
       WHERE sr.sermon_id = s.id ORDER BY sr.id LIMIT 1) as verse,
      se.name as series_name,
      (LENGTH(LOWER(COALESCE(s.transcript_text, ''))) - LENGTH(REPLACE(LOWER(COALESCE(s.transcript_text, '')), ?, ''))) / LENGTH(?) as transcript_matches
    FROM sermons s
    LEFT JOIN series se ON s.series_id = se.id
    WHERE s.transcript_text IS NOT NULL
      AND LOWER(s.transcript_text) LIKE LOWER(?)
    ORDER BY transcript_matches DESC, s.date_preached DESC
    LIMIT ? OFFSET ?
  `;

  const result = await client.execute({
    sql,
    args: [lowerQuery, lowerQuery, searchTerm, limit, offset],
  });

  return rowsToObjects<TranscriptSearchRow>(result.rows);
}

export default client;
