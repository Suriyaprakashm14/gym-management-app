'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type BranchContextValue = {
  selectedBranch: string | null;
  setSelectedBranch: (value: string | null) => void;
};

const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: { children: ReactNode }) {
  const [selectedBranch, setSelectedBranchState] = useState<string | null>(null);
  const setSelectedBranch = useCallback((value: string | null) => {
    setSelectedBranchState(value);
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

