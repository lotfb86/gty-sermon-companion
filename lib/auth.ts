import { cookies } from 'next/headers';
import { getUserBySessionToken, type User } from './auth-db';

const SESSION_COOKIE_NAME = 'gty_session';

/**
 * Get the current authenticated user from the session cookie.
 * For use in Server Components and API routes.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) return null;
    return await getUserBySessionToken(sessionToken);
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME };
