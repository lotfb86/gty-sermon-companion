'use client';

import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[GTY] React Error Boundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    // Clear potentially corrupted localStorage data
    try {
      localStorage.removeItem('gty-listening-queue');
      // Clear any sermon position data that might be corrupt
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('sermon-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      // localStorage might be completely broken — that's ok
    }

    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    this.handleReset();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4">⚠️</div>
            <h2
              className="text-xl font-bold mb-2"
              style={{ color: '#FFFFFF', fontFamily: 'Georgia, serif' }}
            >
              Something went wrong
            </h2>
            <p className="text-sm mb-6" style={{ color: '#A3A3A3' }}>
              The app ran into an unexpected error. This is usually fixed by reloading.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
                style={{
                  background: 'linear-gradient(135deg, #D4AF37, #C19B2B)',
                  color: '#0A0A0A',
                }}
              >
                Reload App
              </button>
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
                style={{
                  background: '#1E1E1E',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                Try Again
              </button>
            </div>
            {this.state.error && (
              <p
                className="mt-4 text-xs font-mono break-all"
                style={{ color: '#525252' }}
              >
                {this.state.error.message}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
