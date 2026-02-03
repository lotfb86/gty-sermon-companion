export function cleanTranscriptText(transcript: string): string {
  if (!transcript) return '';

  let text = transcript;
  const junkPatterns = [
    /^.*?(VIDEO SERMON|AUDIO SERMON).*$/gim,
    /^(WATCH NOW|ADD TO WATCHLIST|SHARE|DOWNLOAD|TRANSCRIPT|PRINT|SERMONS ARCHIVE|RESET|CD|DVD|MP3|MP4)\s*$/gim,
    /^[A-Z]\s*$/gm,
  ];

  for (const pattern of junkPatterns) {
    text = text.replace(pattern, '');
  }

  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  let startIdx = 0;

  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i].trim();
    if (line.length > 60 && /[a-z]/.test(line) && /[.,:;]/.test(line)) {
      startIdx = i;
      break;
    }
  }

  text = lines.slice(startIdx).join('\n');
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitTranscriptIntoBlocks(cleanedTranscript: string): string[] {
  const paragraphBlocks = cleanedTranscript
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, ' ').trim())
    .filter(Boolean);

  if (paragraphBlocks.length > 1) {
    return paragraphBlocks;
  }

  const lineBlocks = cleanedTranscript
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lineBlocks.length > 1) {
    const grouped: string[] = [];
    const chunkSize = 3;
    for (let i = 0; i < lineBlocks.length; i += chunkSize) {
      grouped.push(lineBlocks.slice(i, i + chunkSize).join(' '));
    }
    return grouped;
  }

  const normalized = cleanedTranscript.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const sentenceBlocks = normalized
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“'])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentenceBlocks.length > 1) {
    const grouped: string[] = [];
    const chunkSize = 3;
    for (let i = 0; i < sentenceBlocks.length; i += chunkSize) {
      grouped.push(sentenceBlocks.slice(i, i + chunkSize).join(' '));
    }
    return grouped;
  }

  return [normalized];
}

export function getQueryTerms(query: string): string[] {
  if (!query) return [];
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 2)
    )
  );
}

export function extractTranscriptParagraphs(
  cleanedTranscript: string,
  query?: string
): { paragraphs: string[]; terms: string[]; isHighlighted: boolean } {
  if (!cleanedTranscript) {
    return { paragraphs: [], terms: [], isHighlighted: false };
  }

  const allParagraphs = splitTranscriptIntoBlocks(cleanedTranscript);

  const terms = getQueryTerms(query || '');
  if (terms.length === 0) {
    return { paragraphs: allParagraphs, terms: [], isHighlighted: false };
  }

  const regex = new RegExp(`\\b(${terms.map(escapeRegex).join('|')})\\b`, 'i');
  const highlightedParagraphs = allParagraphs.filter((paragraph) => regex.test(paragraph));

  return {
    paragraphs: highlightedParagraphs,
    terms,
    isHighlighted: true,
  };
}
