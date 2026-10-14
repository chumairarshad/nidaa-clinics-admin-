import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Refresh Supabase session and get security-headers response
  const { response, user } = await updateSession(request);

  // 2. Check master admin token from cookies
  const adminToken = request.cookies.get('nidaa_admin_token')?.value;

  // 3. Check if user is authenticated via master token OR Supabase user
  const isAuthenticated = Boolean(adminToken || user);

  // 4. Handle Root (/)
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = isAuthenticated ? '/dashboard' : '/login';
    return NextResponse.redirect(url);
  }

  // 5. If user is on /login
  if (pathname === '/login') {
    // If already authenticated, redirect to /dashboard
    if (isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    // Otherwise allow unauthenticated user to view /login
    return response;
  }

  // 6. Protect /dashboard and all subroutes
  if (pathname.startsWith('/dashboard')) {
    // If not authenticated, redirect to /login
    if (!isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    // Authenticated: allow access
    return response;
  }

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
     * - api routes (/api/*)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
