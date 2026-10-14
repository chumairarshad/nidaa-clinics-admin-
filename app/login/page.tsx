'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setErrorMessage('');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Check if Supabase credentials are still placeholder
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      // Local dev bypass notice:
      if (password === 'admin' || password.length >= 6) {
        // Allow local dev exploration
        router.push('/dashboard');
        return;
      } else {
        setErrorMessage('Local Dev Notice: Enter password of 6+ characters or configure Supabase credentials in .env.local.');
        setLoading(false);
        return;
      }
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message || 'Invalid email or password.');
      } else if (data?.user) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 30%, #3D0609 0%, #150204 70%, #0A0102 100%)',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(196, 22, 28, 0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Signature Medical Crimson Card (Matching Reference Image) */}
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'linear-gradient(145deg, #BA181E 0%, #8E0E14 45%, #6A0A0E 100%)',
          border: '1px solid rgba(255, 255, 255, 0.22)',
          borderRadius: '24px',
          padding: '3rem 2.5rem',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.6), 0 0 50px rgba(196, 22, 28, 0.3)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Top Pill Badge */}
        <div
          style={{
            display: 'inline-block',
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#FFFFFF',
            background: 'rgba(255, 255, 255, 0.16)',
            border: '1px solid rgba(255, 255, 255, 0.28)',
            padding: '0.35rem 0.9rem',
            borderRadius: '9999px',
            marginBottom: '1.25rem',
          }}
        >
          Evidence-Based Care &bull; CMS Admin
        </div>

        <h1
          style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            margin: '0 0 0.5rem 0',
            color: '#FFFFFF',
            lineHeight: 1.2,
          }}
        >
          NiDAA Clinic: Blog CMS
        </h1>

        <p
          style={{
            fontSize: '0.925rem',
            lineHeight: 1.5,
            color: 'rgba(255, 255, 255, 0.88)',
            margin: '0 0 2rem 0',
          }}
        >
          Secure medical content administration portal for authorized clinic directors and clinical specialists.
        </p>

        {errorMessage && (
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#FFD4D7',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              fontSize: '0.825rem',
              marginBottom: '1.5rem',
              lineHeight: 1.4,
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '0.4rem',
              }}
            >
              Administrator Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@nidaclinic.com"
              required
              className="nidaa-input"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '0.4rem',
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="nidaa-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#8E0E14',
              fontWeight: 800,
              fontSize: '0.95rem',
              borderRadius: '9999px',
              padding: '0.85rem 1.5rem',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
              marginTop: '0.5rem',
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.15)', paddingTop: '1.25rem' }}>
          <a
            href={process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://nidaclinic.com'}
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.825rem',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            &larr; Return to NiDAA Clinic Main Website
          </a>
        </div>
      </div>
    </div>
  );
}
