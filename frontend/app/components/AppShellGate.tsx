'use client';

import { useState, useEffect } from 'react';
import PageLoader from './PageLoader';

/**
 * Gates the full app shell until the client has hydrated.
 *
 * Why this exists:
 *  - globals.css sets a near-black body background (dark-themed landing/auth pages).
 *  - Ant Design CSS-in-JS injected by AntdRegistry is discarded when React detects a
 *    hydration mismatch (e.g. auth state changed via useLayoutEffect during hydration).
 *  - Without this gate, the dark body flashes black for one frame before the dashboard
 *    layout paints its own background.
 *
 * The PageLoader (light-gray #f0f2f5 background) covers the dark body during SSR and
 * the initial client render. AppShellGate's useEffect fires immediately after mount — no
 * artificial delay. Because AuthContext's useIsomorphicLayoutEffect fires BEFORE this
 * useEffect resolves, auth state is already set when the full app renders for the first
 * time, eliminating the "Demo User" flash.
 */
export default function AppShellGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return <PageLoader />;
  }

  return <>{children}</>;
}
