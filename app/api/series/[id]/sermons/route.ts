import { NextRequest, NextResponse } from 'next/server';
import { getSermonsBySeries, getSeriesById } from '@/lib/db';

// GET /api/series/[id]/sermons — Return sermon list for a series
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const seriesId = parseInt(id, 10);

  if (isNaN(seriesId)) {
    return NextResponse.json({ error: 'Invalid series ID' }, { status: 400 });
  }

  const series = await getSeriesById(seriesId);
  if (!series) {
    return NextResponse.json({ error: 'Series not found' }, { status: 404 });
  }

  const sermons = await getSermonsBySeries(seriesId);
  return NextResponse.json({
    series: { id: series.id, name: series.name, book: series.book },
    sermons: sermons.map((s: any) => ({
      sermon_code: s.sermon_code,
      title: s.title,
      audio_url: s.audio_url,
      verse: s.verse,
      date_preached: s.date_preached,
      duration: s.duration,
    })),
  });
}
