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

  // Bypass for tunnel services (ngrok, localtunnel, etc.) or raw IP addresses
  if (
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

  let proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  if (proto.endsWith(':')) {
    proto = proto.slice(0, -1);
  }
  const appOrigin = `${proto}://${appHost}`;
  const rootOrigin = `${proto}://${rootHost}`;

  const pathname = url.pathname;

  // 1. Shared / Customer / Public queue routes (accessible on both domains)
  const isPublicQueueRoute =
    pathname.startsWith('/join') ||
    pathname.startsWith('/j/') ||
    pathname.startsWith('/track') ||
    pathname.startsWith('/display') ||
    pathname.startsWith('/d/') ||
    pathname.startsWith('/qr');

  if (isPublicQueueRoute) {
    return NextResponse.next();
  }

  // 2. Marketing routes (strictly belong on root domain: localhost:3000 / q4queue.com)
  const isMarketingRoute =
    pathname === '/' ||
    pathname.startsWith('/features') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/industries') ||
    pathname.startsWith('/solutions') ||
    pathname.startsWith('/operations') ||
    pathname.startsWith('/product') ||
    pathname.startsWith('/get-started');

  // Helper for cross-domain redirects
  const crossRedirect = (targetOrigin: string, path: string) => {
    const fullUrl = `${targetOrigin}${path}${url.search}`;
    // In local development, Next.js's internal dev-server relativizes redirects targeting localhost,
    // which causes a redirect loop when switching from app.localhost:3000 back to localhost:3000.
    // Serving a standard HTTP 200 HTML/Refresh meta redirect guarantees the browser switches origin.
    if (host.includes('localhost') && !targetOrigin.includes('app.')) {
      const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${fullUrl}"></head><body><script>window.location.replace("${fullUrl}");</script></body></html>`;
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Refresh': `0; url=${fullUrl}`,
        },
      });
    }
    return NextResponse.redirect(new URL(`${path}${url.search}`, targetOrigin));
  };

  // Case A: User is on APP subdomain (app.localhost:3000 / app.q4queue.com)
  if (isAppSubdomain) {
    // Root of app subdomain -> redirect directly to login
    if (pathname === '/') {
      return crossRedirect(appOrigin, '/login');
    }
    // Marketing page accessed on app subdomain -> redirect to root domain
    if (isMarketingRoute) {
      return crossRedirect(rootOrigin, pathname);
    }
    // App route on app subdomain -> allow
    return NextResponse.next();
  }

  // Case B: User is on ROOT domain (localhost:3000 / q4queue.com)
  if (!isAppSubdomain) {
    // App route (login, signup, dashboards, super-admin) accessed on root domain -> redirect to app subdomain
    if (!isMarketingRoute) {
      return crossRedirect(appOrigin, pathname);
    }
    // Marketing page on root domain -> allow
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply to all routes except api, _next static files, and favicon
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
