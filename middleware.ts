import { NextRequest, NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';


export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /admin pages (but not /admin/login itself)
  const isAdminPage = pathname.startsWith('/admin') && !pathname.startsWith('/admin/login');
  // Protect all admin API routes
  const isAdminApi = pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/login');

  if (isAdminPage || isAdminApi) {
    const authenticated = await getRequestSession(req);
    if (!authenticated) {
      if (isAdminApi) {
        return NextResponse.json(
          { error: 'Unauthorized. Please log in.' },
          { status: 401 }
        );
      }
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
