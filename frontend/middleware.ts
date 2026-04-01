import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  // Get hostname from request headers
  const hostname = request.headers.get("host") || "";

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

  // Normalize hostname: remove 'www.' if present to ensure clean subdomain logic
  const normalizedHostname = hostname.replace("www.", "");
  
  // Determine if we are on the 'app' subdomain
  const isAppSubdomain = normalizedHostname.startsWith("app.");
  
  // Construct counterpart hostnames
  const baseDomain = isAppSubdomain ? normalizedHostname.replace('app.', '') : normalizedHostname;
  const appHost = `app.${baseDomain}`;
  const rootHost = baseDomain;

  // Define explicitly marketing/public routes that belong to the root domain
  const marketingRoutes = [
    '/',
    '/about',
    '/get-started',
    '/contact',
    '/privacy-policy',
    '/terms-and-conditions',
    '/super-admin/login'
  ];

  const path = url.pathname;
  const isMarketingRoute = marketingRoutes.includes(path);

  // 1. If the user visits root of app subdomain (app.domain.com/), redirect them to login
  if (isAppSubdomain && path === "/") {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 2. If a user accesses an App route (like /login or /[orgSlug]) on the ROOT domain
  // We need to move them to the App subdomain
  if (!isAppSubdomain && !isMarketingRoute) {
    // Preserve protocol (http for localhost, https for prod ideally)
    const protocol = hostname.includes('localhost') ? 'http:' : 'https:';
    return NextResponse.redirect(`${protocol}//${appHost}${path}${url.search}`);
  }

  // 3. If a user accesses a Marketing route (like /about) on the APP subdomain
  // We need to move them to the ROOT domain
  if (isAppSubdomain && isMarketingRoute && path !== "/") {
    const protocol = hostname.includes('localhost') ? 'http:' : 'https:';
    return NextResponse.redirect(`${protocol}//${rootHost}${path}${url.search}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Ignore API, static paths, and image optimisations
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
