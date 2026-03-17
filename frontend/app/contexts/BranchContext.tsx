'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

const STORAGE_KEY = 'gym_owner_selected_branch';

function readStoredBranch(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const s = sessionStorage.getItem(STORAGE_KEY);
    return s && s.trim() ? s.trim() : null;
  } catch {
    return null;
  }
}

export type BranchContextValue = {
  selectedBranch: string | null;
  setSelectedBranch: (value: string | null) => void;
};

const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: { children: ReactNode }) {
  const [selectedBranch, setSelectedBranchState] = useState<string | null>(() => readStoredBranch());

  const setSelectedBranch = useCallback((value: string | null) => {
    const next = value && String(value).trim() ? String(value).trim() : null;
    setSelectedBranchState(next);
    try {
      if (typeof window !== 'undefined') {
        if (next) sessionStorage.setItem(STORAGE_KEY, next);
        else sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <BranchContext.Provider value={{ selectedBranch, setSelectedBranch }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranchContext(): BranchContextValue {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    throw new Error('useBranchContext must be used within BranchProvider');
  }
  return ctx;
}

