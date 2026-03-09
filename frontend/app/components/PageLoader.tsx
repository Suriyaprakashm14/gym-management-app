'use client';

import React from 'react';

export default function PageLoader() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}
      role="status"
      aria-label="Loading"
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: '3px solid rgba(8,151,156,0.2)',
          borderTopColor: '#08979c',
          borderRadius: '50%',
          animation: 'page-loader-spin 0.7s linear infinite',
        }}
      />
      <style>{'@keyframes page-loader-spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}
