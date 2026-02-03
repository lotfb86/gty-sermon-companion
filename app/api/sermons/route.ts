import { NextRequest, NextResponse } from 'next/server';
import { getAllSermons, type SermonFilterOptions } from '@/lib/db';

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const sort = (searchParams.get('sort') || 'date-desc') as SermonFilterOptions['sort'];
  const hasTranscript = searchParams.get('transcript') === '1' || undefined;
  const sermonType = searchParams.get('type') || undefined;
  const category = searchParams.get('cat') || undefined;

  const filters: SermonFilterOptions = { sort, hasTranscript, sermonType, category };

  const sermons = await getAllSermons(PAGE_SIZE + 1, offset, filters);
  const hasMore = sermons.length > PAGE_SIZE;
  const items = hasMore ? sermons.slice(0, PAGE_SIZE) : sermons;

  // Strip transcript_text to keep payload small
  const lightItems = items.map(({ transcript_text, llm_metadata, ...rest }) => {
    let summary: string | undefined;
    try {
      const meta = llm_metadata ? JSON.parse(llm_metadata) : null;
      summary = typeof meta?.summary === 'string' ? meta.summary : meta?.summary?.brief;
    } catch {}
    return { ...rest, summary };
  });

  return NextResponse.json({
    items: lightItems,
    hasMore,
    nextOffset: offset + items.length,
  });
}
