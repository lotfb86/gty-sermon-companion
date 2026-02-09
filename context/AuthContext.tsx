'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface AuthUser {
  id: number;
  username: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TIMEOUT_MS = 5000; // Don't let auth check hang forever

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check session on mount — with timeout so it never hangs
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, AUTH_TIMEOUT_MS);

    fetch('/api/auth/me', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user || null);
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          console.warn('[GTY] Auth check timed out after', AUTH_TIMEOUT_MS, 'ms');
        } else {
          console.error('[GTY] Auth check failed:', err);
        }
        setUser(null);
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      setUser(data.user);
      return { success: true };
    } catch (err) {
      console.error('[GTY] Login failed:', err);
      return { success: false, error: 'Network error' };
    }
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      setUser(data.user);
      return { success: true };
    } catch (err) {
      console.error('[GTY] Registration failed:', err);
      return { success: false, error: 'Network error' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('[GTY] Logout request failed:', err);
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Default values for when context isn't available (e.g., during SSR pre-rendering)
const defaultAuthContext: AuthContextType = {
  user: null,
  loading: true,
  login: async () => ({ success: false, error: 'Not initialized' }),
  register: async () => ({ success: false, error: 'Not initialized' }),
  logout: async () => {},
};

export function useAuth() {
  const context = useContext(AuthContext);
  // Return safe defaults during SSR pre-rendering when provider isn't mounted
  if (context === undefined) {
    return defaultAuthContext;
  }
  return context;
}
