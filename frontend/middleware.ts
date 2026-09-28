import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get('host') || '';

  // Skip middleware for API routes, Next.js static files, and public assets
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/static') ||
    url.pathname === '/favicon.ico' || 
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Bypass for local development, tunnel services, or raw IP addresses
  if (
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    host.includes('ngrok') || 
    host.includes('loca.lt') || 
    host.includes('trycloudflare.com') ||
    /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(host)
  ) {
    return NextResponse.next();
  }

  const normalizedHost = host.replace(/^www\./, '');
  const isAppSubdomain = normalizedHost.startsWith('app.');
  const baseDomain = isAppSubdomain ? normalizedHost.replace(/^app\./, '') : normalizedHost;
  const appHost = isAppSubdomain ? normalizedHost : `app.${normalizedHost}`;
  const rootHost = baseDomain;

  let proto = request.headers.get('x-forwarded-proto') || 'https';
  if (proto.endsWith(':')) {
    proto = proto.slice(0, -1);
  }
  const appOrigin = `${proto}://${appHost}`;
  const envLandingUrl = process.env.NEXT_PUBLIC_LANDING_URL ? process.env.NEXT_PUBLIC_LANDING_URL.replace(/\/$/, '') : null;
  const rootOrigin = envLandingUrl || `${proto}://${rootHost}`;

  const pathname = url.pathname;

  // 1. Shared / Customer / Public queue routes (accessible on both domains)
  const isPublicQueueRoute =
    pathname.startsWith('/join') ||
    pathname.startsWith('/j/') ||
    pathname.startsWith('/track') ||
    pathname.startsWith('/display') ||
    pathname.startsWith('/d/') ||
    pathname.startsWith('/qr') ||
    pathname.startsWith('/appointments') ||
    pathname.startsWith('/book') ||
    pathname.startsWith('/public');

  if (isPublicQueueRoute) {
    return NextResponse.next();
  }

  // 2. Marketing and Auth routes (accessible on root domain: q4queue.com)
  const isMarketingRoute =
    pathname === '/' ||
    pathname.startsWith('/features') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/industries') ||
    pathname.startsWith('/solutions') ||
    pathname.startsWith('/operations') ||
    pathname.startsWith('/product') ||
    pathname.startsWith('/get-started');

  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/organization-login') ||
    pathname.startsWith('/forgot-password');

  // Helper for cross-domain redirects
  const crossRedirect = (targetOrigin: string, path: string) => {
    return NextResponse.redirect(new URL(`${path}${url.search}`, targetOrigin));
  };

  // Case A: User is on APP subdomain (app.q4queue.com)
  if (isAppSubdomain) {
    // Root of app subdomain -> redirect directly to login
    if (pathname === '/') {
      return crossRedirect(appOrigin, '/login');
    }
    // Marketing page accessed on app subdomain -> redirect to root marketing domain
    if (isMarketingRoute) {
      return crossRedirect(rootOrigin, pathname);
    }
    // Auth and App routes on app subdomain -> allow
    return NextResponse.next();
  }

  // Case B: User is on ROOT domain (q4queue.com)
  if (!isAppSubdomain) {
    // Marketing and Auth routes stay on root domain -> allow
    if (isMarketingRoute || isAuthRoute) {
      return NextResponse.next();
    }
    // Internal portal/dashboard routes (e.g. /[branchSlug]/dashboard, /organization-admin, /super-admin)
    // accessed on root domain -> redirect to app subdomain
    return crossRedirect(appOrigin, pathname);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply to all routes except api, _next static files, and favicon
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
