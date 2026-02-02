/**
 * Metadata dimension registry
 * Maps URL slugs to JSON paths in the llm_metadata column
 */

export interface MetadataDimension {
  slug: string;
  label: string;
  labelPlural: string;
  jsonPath: string;
  /** For object arrays, the JSON key to extract (e.g., '$.name') */
  extractKey?: string;
  /** True if the value is a scalar (not an array) — uses json_extract instead of json_each */
  scalar?: boolean;
  /** Short description for browse cards */
  description: string;
}

export const METADATA_DIMENSIONS: Record<string, MetadataDimension> = {
  'keywords': {
    slug: 'keywords',
    label: 'Keyword',
    labelPlural: 'Keywords',
    jsonPath: '$.keywords',
    description: '20,000+ terms across all sermons',
  },
  'themes': {
    slug: 'themes',
    label: 'Theme',
    labelPlural: 'Themes',
    jsonPath: '$.themes.primary',
    scalar: true,
    description: 'Primary teaching themes',
  },
  'doctrines': {
    slug: 'doctrines',
    label: 'Doctrine Defended',
    labelPlural: 'Doctrines Defended',
    jsonPath: '$.doctrine.key_doctrines_defended',
    description: 'Key doctrines taught and defended',
  },
  'heresies': {
    slug: 'heresies',
    label: 'Heresy Refuted',
    labelPlural: 'Heresies Refuted',
    jsonPath: '$.doctrine.heresies_refuted',
    description: 'False teachings addressed',
  },
  'categories': {
    slug: 'categories',
    label: 'Theological Category',
    labelPlural: 'Theological Categories',
    jsonPath: '$.themes.theological_categories',
    description: 'Soteriology, Christology, Eschatology...',
  },
  'sermon-types': {
    slug: 'sermon-types',
    label: 'Sermon Type',
    labelPlural: 'Sermon Types',
    jsonPath: '$.summary.sermon_type',
    scalar: true,
    description: 'Expository, Topical, Q&A...',
  },
  'authors': {
    slug: 'authors',
    label: 'Author Quoted',
    labelPlural: 'Authors Quoted',
    jsonPath: '$.external_references.authors_quoted',
    extractKey: '$.name',
    description: 'Cited scholars, pastors & writers',
  },
  'hymns': {
    slug: 'hymns',
    label: 'Hymn Mentioned',
    labelPlural: 'Hymns Mentioned',
    jsonPath: '$.external_references.hymns_mentioned',
    extractKey: '$.title',
    description: 'Hymns referenced in sermons',
  },
  'books-referenced': {
    slug: 'books-referenced',
    label: 'Book Referenced',
    labelPlural: 'Books Referenced',
    jsonPath: '$.external_references.books_referenced',
    extractKey: '$.title',
    description: 'Books cited in sermons',
  },
  'characters': {
    slug: 'characters',
    label: 'Biblical Character',
    labelPlural: 'Biblical Characters',
    jsonPath: '$.biblical_content.characters_discussed',
    extractKey: '$.name',
    description: 'People discussed in Scripture',
  },
  'places': {
    slug: 'places',
    label: 'Place Mentioned',
    labelPlural: 'Places Mentioned',
    jsonPath: '$.biblical_content.places_mentioned',
    description: 'Biblical locations',
  },
};

/** Get dimension config by slug, returns null if not found */
export function getDimension(slug: string): MetadataDimension | null {
  return METADATA_DIMENSIONS[slug] || null;
}

/** All dimensions as an array, for rendering browse category lists */
export const ALL_DIMENSIONS = Object.values(METADATA_DIMENSIONS);
