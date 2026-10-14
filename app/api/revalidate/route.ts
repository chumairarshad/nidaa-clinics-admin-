import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

/**
 * NiDAA Clinic CMS — Server-Side Revalidation Proxy
 * Kept strictly server-side: reads server-only REVALIDATION_SECRET and dispatches
 * authenticated webhook to the main website. Never exposes secrets to browser bundles.
 */

export async function POST(request: NextRequest) {
  try {
    // 1. Verify caller has authenticated admin session
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // In production, strictly enforce authenticated user session
    if (process.env.NODE_ENV === 'production' && (!user || authError)) {
      return NextResponse.json(
        { error: 'Unauthorized: Active administrator session required' },
        { status: 401 }
      );
    }

    // 2. Read Server-Only Secret
    const revalSecret = process.env.REVALIDATION_SECRET;
    if (!revalSecret || revalSecret.trim().length < 16) {
      console.error('[revalidate-proxy] Server-only REVALIDATION_SECRET is not configured.');
      return NextResponse.json(
        { error: 'Server misconfiguration: REVALIDATION_SECRET is not set in environment variables' },
        { status: 500 }
      );
    }

    // 3. Parse and forward payload
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const { slug, path } = body;
    const mainSiteUrl = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://nidaclinic.com';

    // 4. Server-to-Server Dispatch
    const remoteResponse = await fetch(`${mainSiteUrl}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidation-secret': revalSecret.trim(),
      },
      body: JSON.stringify({ slug, path }),
    });

    const responseData = await remoteResponse.json().catch(() => ({}));

    if (!remoteResponse.ok) {
      console.warn('[revalidate-proxy] Main website responded with error:', remoteResponse.status, responseData);
      return NextResponse.json(
        {
          error: responseData.error || `Main website returned HTTP ${remoteResponse.status}`,
          status: remoteResponse.status,
        },
        { status: remoteResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('[revalidate-proxy] Dispatch exception:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to dispatch cache revalidation to main site' },
      { status: 500 }
    );
  }
}
