'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('blog@nidclinic.com');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured';
  const mainSiteUrl = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://nidaclinic.com';

  useEffect(() => {
    async function checkHealth() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('blog_posts').select('id').limit(1);
        if (error) {
          setSupabaseConnected(false);
        } else {
          setSupabaseConnected(true);
        }

        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.email) {
          setUserEmail(userData.user.email);
        }
      } catch {
        setSupabaseConnected(false);
      }
    }

    void checkHealth();
  }, []);

  const testRevalidation = async () => {
    setPinging(true);
    setPingStatus(null);

    try {
      const res = await fetch('/api/revalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: '/blog' }),
      });

      const data = await res.json();
      if (res.ok) {
        setPingStatus(`✅ Success (HTTP ${res.status}): Server dispatched cache revalidation to main site.`);
      } else {
        setPingStatus(`⚠️ Proxy responded with HTTP ${res.status}: ${data.error || 'Check server REVALIDATION_SECRET'}`);
      }
    } catch (err: any) {
      setPingStatus(`⚠️ Test failed: ${err.message}.`);
    } finally {
      setPinging(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', color: '#1F2937' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <span
          style={{
            display: 'inline-block',
            fontSize: '0.72rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#BA181E',
            background: 'rgba(186, 24, 30, 0.08)',
            border: '1px solid rgba(186, 24, 30, 0.2)',
            padding: '0.35rem 0.9rem',
            borderRadius: '9999px',
            marginBottom: '0.6rem',
          }}
        >
          System &amp; Architecture
        </span>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
          CMS &amp; Deployment Settings
        </h1>
        <p style={{ color: '#4B5563', fontSize: '0.95rem', marginTop: '0.35rem' }}>
          Verify database connections, cross-project cache revalidation webhooks, and independent deployment parameters.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Supabase Connection Status Card */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Supabase Shared Database
              </h2>
              <p style={{ color: '#6B7280', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
                PostgreSQL database storing published medical articles, categories, and author metadata.
              </p>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: supabaseConnected ? '#059669' : '#D97706',
                background: supabaseConnected ? '#ECFDF5' : '#FFFBEB',
                border: `1px solid ${supabaseConnected ? '#A7F3D0' : '#FDE68A'}`,
                padding: '0.4rem 0.9rem',
                borderRadius: '9999px',
              }}
            >
              <span style={{ fontSize: '0.7rem' }}>●</span>
              <span>{supabaseConnected === true ? 'Connected' : supabaseConnected === false ? 'Awaiting Env Keys' : 'Checking...'}</span>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '1.1rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.72rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                Supabase URL (NEXT_PUBLIC_SUPABASE_URL)
              </div>
              <div style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: '#1F2937', wordBreak: 'break-all', fontWeight: 600 }}>
                {supabaseUrl}
              </div>
            </div>

            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '1.1rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.72rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                Storage Bucket
              </div>
              <div style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: '#BA181E', fontWeight: 600 }}>
                blog-media (Public read, Authenticated write)
              </div>
            </div>

            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '1.1rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.72rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                Active Admin User
              </div>
              <div style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 600 }}>
                👤 {userEmail}
              </div>
            </div>

            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '1.1rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.72rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                Security &amp; Authorization
              </div>
              <div style={{ fontSize: '0.875rem', color: '#059669', fontWeight: 600 }}>
                🛡️ Row Level Security (RLS) Active
              </div>
            </div>
          </div>
        </div>

        {/* Cross-Project Cache Invalidation Settings */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🔄</span> Cross-Project Instant Cache Invalidation
          </h2>
          <p style={{ color: '#4B5563', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            When articles are published, edited, or deleted from this admin dashboard, a secure webhook is triggered
            to instantly bust the Next.js cache on the main NiDAA Clinic website without needing a manual code redeploy.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                Target Public Website URL
              </label>
              <input
                type="text"
                readOnly
                value={mainSiteUrl}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: '#F9FAFB',
                  border: '1px solid #D1D5DB',
                  borderRadius: '10px',
                  color: '#111827',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                Server-Side Secret Status
              </label>
              <div
                style={{
                  padding: '0.85rem 1rem',
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '10px',
                  color: '#065F46',
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>🔒</span> Secured via server-only REVALIDATION_SECRET (Never exposed to browser)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={testRevalidation}
              disabled={pinging}
              style={{
                background: 'linear-gradient(135deg, #BA181E 0%, #8E0E14 100%)',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '9999px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: pinging ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(186, 24, 30, 0.25)',
              }}
            >
              {pinging ? 'Pinging Main Website...' : '⚡ Test Cache Revalidation Webhook'}
            </button>
          </div>

          {pingStatus && (
            <div
              style={{
                marginTop: '1.25rem',
                padding: '0.85rem 1.25rem',
                borderRadius: '10px',
                background: pingStatus.startsWith('✅') ? '#ECFDF5' : '#FFFBEB',
                border: `1px solid ${pingStatus.startsWith('✅') ? '#A7F3D0' : '#FDE68A'}`,
                fontSize: '0.875rem',
                color: pingStatus.startsWith('✅') ? '#065F46' : '#92400E',
                fontWeight: 600,
              }}
            >
              {pingStatus}
            </div>
          )}
        </div>

        {/* Public Endpoints Card */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🌐</span> Production Public Endpoints
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ color: '#4B5563', fontWeight: 600 }}>Public Blog Directory:</span>
              <a href="https://nidaclinic.com/blog" target="_blank" rel="noopener noreferrer" style={{ color: '#BA181E', fontWeight: 700, textDecoration: 'none' }}>
                https://nidaclinic.com/blog →
              </a>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ color: '#4B5563', fontWeight: 600 }}>XML Sitemap for Search Engines:</span>
              <a href="https://nidaclinic.com/sitemap.xml" target="_blank" rel="noopener noreferrer" style={{ color: '#BA181E', fontWeight: 700, textDecoration: 'none' }}>
                https://nidaclinic.com/sitemap.xml →
              </a>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0' }}>
              <span style={{ color: '#4B5563', fontWeight: 600 }}>Standalone CMS Admin:</span>
              <span style={{ color: '#059669', fontWeight: 700, fontFamily: 'monospace' }}>https://blog.nidaclinic.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
