'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { User } from 'lucide-react';

export default function ListeningAuthBanner() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return (
      <Link href="/account" className="block">
        <div className="card flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--accent)]/10 rounded-full flex items-center justify-center shrink-0">
            <User className="text-[var(--accent)]" size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[var(--text-primary)]">
              Signed in as <span className="text-[var(--accent)]">{user.username}</span>
            </p>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Your listening progress syncs automatically
            </p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="card-elevated">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-full flex items-center justify-center shrink-0">
          <User className="text-[var(--accent)]" size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-0.5">
            Sync Your Progress
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mb-2">
            Create an account to save your listening history across devices.
          </p>
          <div className="flex gap-2">
            <Link href="/register" className="btn btn-primary text-xs py-1.5 px-3">
              Create Account
            </Link>
            <Link href="/login" className="btn btn-secondary text-xs py-1.5 px-3">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
