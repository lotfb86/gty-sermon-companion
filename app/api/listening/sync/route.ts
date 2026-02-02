import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { saveListeningPosition, getListeningHistory } from '@/lib/auth-db';

// GET — retrieve all listening history for the current user
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const history = await getListeningHistory(user.id);
  return NextResponse.json({ history });
}

// POST — save a listening position
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { sermon_code, position, duration } = body;

    if (!sermon_code || position === undefined) {
      return NextResponse.json(
        { error: 'sermon_code and position are required' },
        { status: 400 }
      );
    }

    await saveListeningPosition(user.id, sermon_code, position, duration || 0);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
