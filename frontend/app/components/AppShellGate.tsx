'use client';

import React, { useState, useEffect } from 'react';
import PageLoader from './PageLoader';

/**
 * Hides the full app UI (sidebar + content) until the client has hydrated and
 * Ant Design styles have had a chance to inject, preventing FOUC on refresh.
 */
export default function AppShellGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait for hydration + give Ant Design CSS-in-JS time to inject before showing the shell.
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!ready) {
    return <PageLoader />;
  }

  return <>{children}</>;
}
