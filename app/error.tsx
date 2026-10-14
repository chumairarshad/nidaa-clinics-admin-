'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        color: '#111827',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#BA181E' }}>
        System Error
      </h1>
      <p style={{ color: '#6B7280', maxWidth: '400px', marginBottom: '2rem' }}>
        An unexpected error occurred in the blog CMS administration dashboard.
      </p>
      <button
        onClick={() => reset()}
        style={{
          backgroundColor: '#BA181E',
          color: '#FFFFFF',
          padding: '0.75rem 1.5rem',
          borderRadius: '9999px',
          fontWeight: 700,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Try Again
      </button>
    </div>
  );
}
