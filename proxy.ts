import { NextResponse, type NextRequest } from 'next/server';

/* Without the session cookie, pages go to /login and the API answers 401. The session itself is
 * checked against MongoDB by every API route (lib/auth/session.ts). */
export function proxy(req: NextRequest) {
  if (req.cookies.has('ab_session')) return NextResponse.next();
  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith('/api/')) return Response.json({ error: 'Sign in first' }, { status: 401 });
  const url = new URL('/login', req.url);
  if (pathname !== '/') url.searchParams.set('next', pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!login|api/auth/login|api/health|_next/static|_next/image|favicon.ico).*)'],
};
