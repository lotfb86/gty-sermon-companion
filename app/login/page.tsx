'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) router.push('/listening');
  }, [user, router]);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      router.push('/listening');
    } else {
      setError(result.error || 'Login failed');
    }
  };

  return (
    <div className="pb-40 animate-fade-in">
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-30 border-b border-white/5">
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">Sign In</h1>
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
          Your Account
        </p>
      </header>

      <main className="px-4 py-8">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">📖</div>
            <h2 className="font-serif text-xl font-semibold text-[var(--text-primary)] mb-2">
              Welcome Back
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Sign in to sync your listening history
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input w-full"
                placeholder="Enter your username"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input w-full"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full text-sm"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
