import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { moveInQueue } from '@/lib/auth-db';

// PUT /api/queue/reorder — Move item up or down
// Body: { sermon_code, direction: 'up' | 'down' }
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  if (!body.sermon_code || !body.direction) {
    return NextResponse.json({ error: 'Missing sermon_code or direction' }, { status: 400 });
  }

  if (body.direction !== 'up' && body.direction !== 'down') {
    return NextResponse.json({ error: 'Direction must be "up" or "down"' }, { status: 400 });
  }

  await moveInQueue(user.id, body.sermon_code, body.direction);
  return NextResponse.json({ success: true });
}
