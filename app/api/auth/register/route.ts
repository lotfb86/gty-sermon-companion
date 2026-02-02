import { NextRequest, NextResponse } from 'next/server';
import { createUser, createSession } from '@/lib/auth-db';
import { SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const user = await createUser(username, password);
    const token = await createSession(user.id);

    const response = NextResponse.json({
      user: { id: user.id, username: user.username },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error: any) {
    const message = error?.message || 'Registration failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
