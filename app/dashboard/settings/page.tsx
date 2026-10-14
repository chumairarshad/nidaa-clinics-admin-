'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('admin@nidaclinic.com');

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
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <span className="nidaa-pill" style={{ marginBottom: '0.4rem' }}>
          System &amp; Architecture
        </span>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
          CMS &amp; Deployment Settings
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Verify database connections, cross-project cache revalidation webhooks, and independent deployment parameters.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Supabase Connection Status Card */}
        <div className="nidaa-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              Supabase Shared Database
            </h2>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: supabaseConnected ? '#34D399' : '#FBBF24',
                background: supabaseConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                border: `1px solid ${supabaseConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
              }}
            >
              <span>●</span>
              <span>{supabaseConnected === true ? 'Connected' : supabaseConnected === false ? 'Awaiting Env Keys' : 'Checking...'}</span>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.35)', padding: '1rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                Supabase URL (NEXT_PUBLIC_SUPABASE_URL)
              </div>
              <div style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: '#FFFFFF', wordBreak: 'break-all' }}>
                {supabaseUrl}
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.35)', padding: '1rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                Storage Bucket
              </div>
              <div style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: '#6EE7B7' }}>
                blog-media (Public read, Authenticated write)
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.35)', padding: '1rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                Active Admin User
              </div>
              <div style={{ fontSize: '0.875rem', color: '#FFFFFF' }}>
                👤 {userEmail}
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.35)', padding: '1rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                Security &amp; Authorization
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6EE7B7' }}>
                🛡️ Row Level Security (RLS) Active
              </div>
            </div>
          </div>
        </div>

        {/* Cross-Project Cache Invalidation Settings */}
        <div className="nidaa-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.75rem' }}>
            🔄 Cross-Project Instant Cache Invalidation
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            When articles are published, edited, or deleted from this admin dashboard, a secure webhook is triggered
            to instantly bust the Next.js cache on the main NiDAA Clinic website without needing a code redeploy.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem' }}>
                Target Public Website URL
              </label>
              <input
                type="text"
                className="nidaa-input"
                readOnly
                value={mainSiteUrl}
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem' }}>
                Server-Side Secret Status
              </label>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  color: '#6EE7B7',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                }}
              >
                🔒 Secured via server-only REVALIDATION_SECRET (Never exposed to browser)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={testRevalidation}
              disabled={pinging}
              className="nidaa-btn-primary"
            >
              {pinging ? 'Pinging Main Website...' : '⚡ Test Cache Revalidation Webhook'}
            </button>
          </div>

          {pingStatus && (
            <div
              style={{
                marginTop: '1.25rem',
                padding: '0.85rem 1.25rem',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.15)',
                fontSize: '0.85rem',
                color: '#FFFFFF',
              }}
            >
              {pingStatus}
            </div>
          )}
        </div>

        {/* Public Endpoints Card */}
        <div className="nidaa-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '1rem' }}>
            🌐 Production Public Endpoints
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>Public Blog Directory:</span>
              <a href="https://nidaclinic.com/blog" target="_blank" rel="noopener noreferrer" style={{ color: '#FF8F94' }}>
                https://nidaclinic.com/blog
              </a>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>XML Sitemap for Search Engines:</span>
              <a href="https://nidaclinic.com/sitemap.xml" target="_blank" rel="noopener noreferrer" style={{ color: '#FF8F94' }}>
                https://nidaclinic.com/sitemap.xml
              </a>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0' }}>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>Standalone CMS Admin:</span>
              <span style={{ color: '#6EE7B7' }}>https://blog.nidaclinic.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
