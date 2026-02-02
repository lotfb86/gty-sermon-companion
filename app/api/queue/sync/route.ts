import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { replaceQueue } from '@/lib/auth-db';

// PUT /api/queue/sync — Bulk replace entire queue in one transaction
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const items = body.items;

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'items must be an array' }, { status: 400 });
  }

  const mapped = items.map((item: any) => ({
    sermonCode: item.sermon_code || item.sermonCode,
    sourceType: item.source_type || item.sourceType || 'individual',
    sourceId: item.source_id ?? item.sourceId ?? null,
  }));

  await replaceQueue(user.id, mapped);
  return NextResponse.json({ success: true, count: mapped.length });
}
