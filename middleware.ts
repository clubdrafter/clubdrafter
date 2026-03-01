import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { verifyAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Admin route protection (cookie-based, no Supabase)
  if (pathname.startsWith('/admin')) {
    // Always allow the login page and its API
    if (pathname === '/admin/login' || pathname.startsWith('/api/admin/auth')) {
      return NextResponse.next()
    }

    const token = request.cookies.get(ADMIN_COOKIE)?.value
    if (!token || !(await verifyAdminToken(token))) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // Attach pathname header so layout can detect login page server-side
    const response = NextResponse.next()
    response.headers.set('x-pathname', pathname)
    return response
  }

  // ── Supabase session refresh for all other routes
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
