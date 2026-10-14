import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminToken = request.cookies.get('nidaa_admin_token')?.value;

  // Root redirect: if authenticated go to /dashboard, otherwise go to /login
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = adminToken ? '/dashboard' : '/login';
    return NextResponse.redirect(url);
  }

  // If user is accessing /login while already authenticated, redirect to /dashboard
  if (pathname === '/login' && adminToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // If user is accessing protected /dashboard routes without token, redirect to /login
  if (pathname.startsWith('/dashboard') && !adminToken) {
    // Check if Supabase session exists before bouncing
    const supabaseSessionResponse = await updateSession(request);
    // If updateSession redirected to /login, return it
    if (supabaseSessionResponse.headers.get('location')?.includes('/login')) {
      return supabaseSessionResponse;
    }
    // If no admin token and no Supabase user, redirect to /login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Refresh auth session & enforce route boundaries
  const response = await updateSession(request);

  // Security headers for private admin panel
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions (.svg, .png, .jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
