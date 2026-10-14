import React from 'react';
import Link from 'next/link';

export default function NotFound() {
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
      <h1 style={{ fontSize: '3rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#BA181E' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1rem 0' }}>Page Not Found</h2>
      <p style={{ color: '#6B7280', maxWidth: '400px', marginBottom: '2rem' }}>
        The clinical content or administration page you requested could not be located.
      </p>
      <a
        href="/login"
        style={{
          backgroundColor: '#BA181E',
          color: '#FFFFFF',
          padding: '0.75rem 1.5rem',
          borderRadius: '9999px',
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        Return to Login
      </a>
    </div>
  );
}
