'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, LogOut, Headphones } from 'lucide-react';

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="pb-32 animate-fade-in">
        <header className="px-4 pt-10 pb-3 glass sticky top-0 z-30 border-b border-white/5">
          <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">Account</h1>
        </header>
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pb-32 animate-fade-in">
        <header className="px-4 pt-10 pb-3 glass sticky top-0 z-30 border-b border-white/5">
          <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">Account</h1>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
            Sign in to continue
          </p>
        </header>
        <main className="px-4 py-8 text-center">
          <div className="text-4xl mb-3">👤</div>
          <h2 className="font-serif text-lg font-semibold text-[var(--text-primary)] mb-2">
            Not Signed In
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Sign in to sync your listening history across devices.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/login" className="btn btn-primary text-sm">
              Sign In
            </Link>
            <Link href="/register" className="btn btn-secondary text-sm">
              Create Account
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="pb-32 animate-fade-in">
      <header className="px-4 pt-10 pb-3 glass sticky top-0 z-30 border-b border-white/5">
        <h1 className="font-serif text-lg font-semibold text-[var(--gold-text)]">Account</h1>
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.2em] mt-0.5">
          Your Profile
        </p>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Profile Card */}
        <div className="card-elevated">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[var(--accent)]/10 rounded-full flex items-center justify-center">
              <User className="text-[var(--accent)]" size={24} />
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold text-[var(--text-primary)]">
                {user.username}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Signed in
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <Link href="/listening" className="card group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-full flex items-center justify-center shrink-0">
              <Headphones className="text-[var(--accent)]" size={18} />
            </div>
            <div className="flex-1">
              <h3 className="font-serif font-medium text-[var(--text-primary)] text-sm group-hover:text-[var(--accent)] transition-colors">
                Listening History
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                View your listening progress
              </p>
            </div>
          </div>
        </Link>

        {/* Sign Out */}
        <button
          onClick={handleLogout}
          className="card group w-full text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center shrink-0">
              <LogOut className="text-red-400" size={18} />
            </div>
            <div className="flex-1">
              <h3 className="font-serif font-medium text-red-400 text-sm">
                Sign Out
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Sign out of your account
              </p>
            </div>
          </div>
        </button>
      </main>
    </div>
  );
}
