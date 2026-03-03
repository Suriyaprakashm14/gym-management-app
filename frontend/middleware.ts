import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/landing', '/login', '/forgot-password'];
const DASHBOARD_PREFIXES = ['/dashboard', '/members', '/branches', '/billing', '/revenue'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isDashboard(pathname: string): boolean {
  return pathname === '/' || DASHBOARD_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  if (pathname === '/') {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/landing', request.url));
  }

  if (isPublic(pathname)) {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (isDashboard(pathname) && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/landing', '/login', '/forgot-password', '/dashboard', '/dashboard/:path*', '/members', '/members/:path*', '/branches', '/billing', '/revenue'],
};
