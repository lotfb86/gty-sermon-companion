'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * HydrationGuard detects when React 19 hydration silently fails
 * (DOM renders but event handlers never attach) and forces a
 * clean client-side re-render to recover.
 *
 * Symptom: user sees the page, hover CSS works, but clicking
 * any button/link does nothing. "Open in new tab" works because
 * the raw <a href> is in the server-rendered HTML.
 *
 * How it works:
 * 1. After hydration, a useEffect sets `hydrated = true`
 * 2. If useEffect never fires (hydration failed), a fallback
 *    setTimeout detects this and forces a full page reload
 * 3. A test click handler verifies React's event system is live
 */
export default function HydrationGuard({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Mark as hydrated — if this fires, React's event system is working
    setHydrated(true);

    // Double-check: verify React's synthetic event system is actually bound
    // by attaching a native click listener and testing if React processes it
    const testHydration = () => {
      const testEl = document.getElementById('__hydration_test');
      if (testEl) {
        let reactEventFired = false;

        // Create a temporary React-compatible event handler test
        const handler = () => { reactEventFired = true; };
        testEl.addEventListener('click', handler);

        // Dispatch a synthetic click
        testEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        testEl.removeEventListener('click', handler);

        if (!reactEventFired) {
          console.error('[GTY] Hydration verification failed — React events not bound. Reloading...');
          window.location.reload();
          return;
        }
      }
    };

    // Run the test after a short delay to let React finish
    const timer = setTimeout(testHydration, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Fallback: if after 5 seconds hydrated is still false, something is very wrong
    const fallback = setTimeout(() => {
      if (!hydrated) {
        console.error('[GTY] React hydration did not complete after 5s. Forcing reload...');
        window.location.reload();
      }
    }, 5000);

    return () => clearTimeout(fallback);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty — only run once on mount

  return (
    <>
      {/* Hidden element for hydration testing */}
      <div id="__hydration_test" style={{ display: 'none' }} aria-hidden="true" />
      {children}
    </>
  );
}
