import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read admin auth token from cookie
  const adminToken = request.cookies.get('nidaa_admin_token')?.value;
  const isAuthenticated = Boolean(adminToken && adminToken.trim().length > 0);

  // 1. Root path (/)
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = isAuthenticated ? '/dashboard' : '/login';
    return NextResponse.redirect(url);
  }

  // 2. Login path (/login)
  if (pathname === '/login') {
    // If user is already authenticated, redirect to /dashboard
    if (isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    // Otherwise allow viewing /login directly
    return NextResponse.next();
  }

  // 3. Dashboard paths (/dashboard, /dashboard/*)
  if (pathname.startsWith('/dashboard')) {
    // If not authenticated, redirect to /login
    if (!isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    // Authenticated: allow access
    return NextResponse.next();
  }

  return NextResponse.next();
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
