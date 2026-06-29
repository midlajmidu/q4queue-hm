import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

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

  // If the user visits the root path, redirect them to login
  if (url.pathname === "/") {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Ignore API, static paths, and image optimisations
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
