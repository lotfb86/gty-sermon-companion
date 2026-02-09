import { NextRequest, NextResponse } from 'next/server';

// Diagnostic endpoint: logs client-side JS errors so they appear in Vercel runtime logs.
// This helps us debug issues that only occur on the client (like hydration failures).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source, message, extra, url, ua } = body;

    // Log prominently so it shows up in Vercel's log viewer
    console.error(
      `[CLIENT ERROR] source=${source} | url=${url} | message=${message}${extra ? ` | extra=${extra}` : ''} | ua=${ua}`
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
