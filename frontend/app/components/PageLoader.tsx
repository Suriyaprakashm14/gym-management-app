'use client';

import React from 'react';

export type PageLoaderProps = {
  /** Optional line under the spinner (e.g. “Loading revenue…”) */
  message?: string;
};

export default function PageLoader({ message }: PageLoaderProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
        gap: 20,
      }}
      role="status"
      aria-label={message || 'Loading'}
    >
      <div
        style={{
          width: 52,
          height: 52,
          border: '4px solid rgba(8,151,156,0.2)',
          borderTopColor: '#08979c',
          borderRadius: '50%',
          animation: 'page-loader-spin 0.75s linear infinite',
        }}
      />
      {message ? (
        <p style={{ margin: 0, color: '#595959', fontSize: 15, fontWeight: 500 }}>{message}</p>
      ) : null}
      <style>{'@keyframes page-loader-spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}
