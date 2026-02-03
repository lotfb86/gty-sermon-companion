/**
 * Extract highlighted snippets from transcript text around search query matches.
 * Returns 2-3 snippets of ~150 chars each with the matched terms wrapped in <mark> tags.
 */
export interface TranscriptSnippet {
  text: string; // HTML string with <mark> highlights
}

export function extractSnippets(
  transcript: string,
  query: string,
  maxSnippets = 3,
  snippetLength = 150
): TranscriptSnippet[] {
  if (!transcript || !query) return [];

  const lowerTranscript = transcript.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const terms = lowerQuery.split(/\s+/).filter(t => t.length >= 2);

  if (terms.length === 0) return [];

  // Find all match positions for the full query first, then individual terms
  const positions: number[] = [];

  // Try full query match first
  let idx = lowerTranscript.indexOf(lowerQuery);
  while (idx !== -1 && positions.length < 20) {
    positions.push(idx);
    idx = lowerTranscript.indexOf(lowerQuery, idx + 1);
  }

  // If no full matches, search for individual terms
  if (positions.length === 0) {
    for (const term of terms) {
      let termIdx = lowerTranscript.indexOf(term);
      while (termIdx !== -1 && positions.length < 20) {
        positions.push(termIdx);
        termIdx = lowerTranscript.indexOf(term, termIdx + 1);
      }
    }
  }

  if (positions.length === 0) return [];

  // Select spaced positions
  positions.sort((a, b) => a - b);
  const selected: number[] = [positions[0]];
  for (const pos of positions) {
    if (selected.length >= maxSnippets) break;
    const tooClose = selected.some(s => Math.abs(s - pos) < snippetLength * 1.5);
    if (!tooClose) {
      selected.push(pos);
    }
  }

  // Extract snippets at each position
  return selected.map(pos => {
    // Find word boundary for start
    let start = Math.max(0, pos - Math.floor(snippetLength / 2));
    if (start > 0) {
      const spaceIdx = transcript.indexOf(' ', start);
      if (spaceIdx !== -1 && spaceIdx < start + 20) {
        start = spaceIdx + 1;
      }
    }

    // Find word boundary for end
    let end = Math.min(transcript.length, start + snippetLength);
    if (end < transcript.length) {
      const spaceIdx = transcript.lastIndexOf(' ', end);
      if (spaceIdx > start + snippetLength - 30) {
        end = spaceIdx;
      }
    }

    let snippetText = transcript.slice(start, end).trim();

    // Add ellipsis
    if (start > 0) snippetText = '...' + snippetText;
    if (end < transcript.length) snippetText = snippetText + '...';

    // Highlight terms in the snippet
    const highlighted = highlightTerms(snippetText, terms);

    return { text: highlighted };
  });
}

function highlightTerms(text: string, terms: string[]): string {
  // Sort terms by length desc to avoid partial replacements
  const sorted = [...terms].sort((a, b) => b.length - a.length);
  let result = text;

  for (const term of sorted) {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
    result = result.replace(regex, '<mark>$1</mark>');
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
