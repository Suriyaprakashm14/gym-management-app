'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type MemberFilterValue = 'activeUsers' | 'recentlyExpired' | 'archivedUsers';

interface MemberFilterContextType {
  filter: MemberFilterValue;
  setFilter: (value: MemberFilterValue) => void;
}

const MemberFilterContext = createContext<MemberFilterContextType | null>(null);

export function MemberFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<MemberFilterValue>('activeUsers');
  const setFilterStable = useCallback((value: MemberFilterValue) => setFilter(value), []);
  return (
    <MemberFilterContext.Provider value={{ filter, setFilter: setFilterStable }}>
      {children}
    </MemberFilterContext.Provider>
  );
}

export function useMemberFilter(): MemberFilterContextType {
  const ctx = useContext(MemberFilterContext);
  if (!ctx) {
    throw new Error('useMemberFilter must be used within MemberFilterProvider');
  }
  return ctx;
}
