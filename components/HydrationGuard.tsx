'use client';

import { useEffect, type ReactNode } from 'react';

/**
 * HydrationGuard captures client-side errors (including hydration failures)
 * and reports them to a server endpoint so we can see them in Vercel logs.
 * It also catches unhandled promise rejections and global errors.
 */
export default function HydrationGuard({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Report any error to our diagnostic endpoint so it shows in Vercel logs
    const reportError = (source: string, message: string, extra?: string) => {
      const payload = { source, message, extra, url: window.location.pathname, ua: navigator.userAgent };
      // Use sendBeacon for reliability (fires even during page unload)
      try {
        navigator.sendBeacon(
          '/api/client-error',
          new Blob([JSON.stringify(payload)], { type: 'application/json' })
        );
      } catch {
        // Fallback to fetch
        fetch('/api/client-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    };

    // Catch all unhandled JS errors
    const errorHandler = (event: ErrorEvent) => {
      reportError('window.onerror', event.message, `${event.filename}:${event.lineno}:${event.colno}`);
    };

    // Catch unhandled promise rejections
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || event.reason?.toString() || 'Unknown rejection';
      reportError('unhandledrejection', msg);
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    // Log that hydration completed successfully
    console.log('[GTY] React hydrated successfully at', new Date().toISOString());

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  return <>{children}</>;
}
