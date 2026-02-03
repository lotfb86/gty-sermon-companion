import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getListeningHistoryPage } from '@/lib/auth-db';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const range = request.nextUrl.searchParams.get('range') || undefined;
  const limit = Number(request.nextUrl.searchParams.get('limit') || '30');
  const offset = Number(request.nextUrl.searchParams.get('offset') || '0');

  const history = await getListeningHistoryPage(user.id, range, limit, offset);
  return NextResponse.json(history);
}
