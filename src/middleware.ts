import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  const publicRoutes = [
    '/',
    '/auth/login',
    '/auth/signup',
    '/auth/verification',
    '/pre-login'
  ];
  const isPublicRoute = publicRoutes.includes(pathname);
  const isAuthCallbackRoute = pathname.startsWith('/auth/callback');
  const isPostLoginRoute = pathname.startsWith('/post-login');

  if (!session && !isPublicRoute && !isAuthCallbackRoute) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  if (session && isPublicRoute && !isAuthCallbackRoute) {
    return NextResponse.redirect(new URL('/post-login', req.url));
  }

  return res;
}

// ✅ Use specific folders you want to protect
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/post-login/:path*',
    '/some-protected-page', // add other protected paths here
  ],
};
