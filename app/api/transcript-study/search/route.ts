import { NextRequest, NextResponse } from 'next/server';
import {
  parseScriptureQuery,
  searchTranscriptStudyByReference,
  searchTranscriptStudyByText,
  type TranscriptStudyMode,
  type TranscriptStudyTextMatchMode,
} from '@/lib/db';

function getNumberParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = (searchParams.get('mode') || 'scripture') as TranscriptStudyMode;
  const normalizedMode: TranscriptStudyMode = mode === 'text' ? 'text' : 'scripture';
  const rawBook = (searchParams.get('book') || '').trim();
  const chapter = getNumberParam(searchParams.get('chapter'));
  const verse = getNumberParam(searchParams.get('verse'));
  const query = (searchParams.get('q') || '').trim();
  const matchParam = (searchParams.get('match') || 'exact') as TranscriptStudyTextMatchMode;
  const matchMode: TranscriptStudyTextMatchMode = matchParam === 'all_words' ? 'all_words' : 'exact';
  const selectedYears = searchParams
    .getAll('year')
    .map((value) => parseInt(value, 10))
    .filter((value) => !Number.isNaN(value));
  const limit = Math.min(20, getNumberParam(searchParams.get('limit')) || 6);
  const offset = Math.max(0, getNumberParam(searchParams.get('offset')) || 0);
  const selectedDoctrines = searchParams.getAll('doctrine').map((item) => item.trim()).filter(Boolean);

  if (normalizedMode === 'text') {
    if (!query) {
      return NextResponse.json(
        { error: 'q is required when mode=text.' },
        { status: 400 }
      );
    }

    const result = await searchTranscriptStudyByText({
      query,
      matchMode,
      selectedYears,
      selectedDoctrines,
      limit,
      offset,
    });

    return NextResponse.json(result);
  }

  const normalizedBook = rawBook ? parseScriptureQuery(`${rawBook} 1`)?.book : undefined;
  if (!normalizedBook || !chapter || !verse) {
    return NextResponse.json(
      { error: 'book, chapter, and verse are required.' },
      { status: 400 }
    );
  }

  const result = await searchTranscriptStudyByReference({
    book: normalizedBook,
    chapter,
    verse,
    selectedYears,
    selectedDoctrines,
    limit,
    offset,
  });

  return NextResponse.json(result);
}
