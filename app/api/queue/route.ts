import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getQueue,
  addToQueue,
  insertAtTopOfQueue,
  addSeriesToQueue,
  removeFromQueue,
  clearQueue,
} from '@/lib/auth-db';
import { getSermonsBySeries } from '@/lib/db';

// GET /api/queue — Return the user's full queue
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const queue = await getQueue(user.id);
  return NextResponse.json({ queue });
}

// POST /api/queue — Add item(s) to queue
// Body: { sermon_code, source_type?, source_id?, insert_at_top?: boolean }
//   OR: { series_id } — expands to all sermons in series
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  // Add entire series
  if (body.series_id) {
    const sermons = await getSermonsBySeries(parseInt(body.series_id, 10));
    const codes = sermons.map((s: any) => s.sermon_code);
    await addSeriesToQueue(user.id, parseInt(body.series_id, 10), codes);
    return NextResponse.json({ success: true, added: codes.length });
  }

  // Add single sermon
  if (body.sermon_code) {
    const sourceType = body.source_type || 'individual';
    const sourceId = body.source_id || null;

    if (body.insert_at_top) {
      await insertAtTopOfQueue(user.id, body.sermon_code, sourceType, sourceId);
    } else {
      await addToQueue(user.id, body.sermon_code, sourceType, sourceId);
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Missing sermon_code or series_id' }, { status: 400 });
}

// DELETE /api/queue — Remove item or clear queue
// Body: { sermon_code } OR { clear: true }
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  if (body.clear) {
    await clearQueue(user.id);
    return NextResponse.json({ success: true });
  }

  if (body.sermon_code) {
    await removeFromQueue(user.id, body.sermon_code);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Missing sermon_code or clear flag' }, { status: 400 });
}
