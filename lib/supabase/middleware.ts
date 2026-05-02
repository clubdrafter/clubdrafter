import { NextResponse, type NextRequest } from 'next/server'

// Check for session purely via cookie — zero network calls, no timeout risk.
// Supabase SSR stores the session in cookies named sb-<project-ref>-auth-token[.N]
// Actual token validation happens in Server Components via getUser().
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token')
  )
}

export function updateSession(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname
  const loggedIn = hasSessionCookie(request)

  // Protect main app routes
  const isMainRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/auction') ||
    (pathname.startsWith('/admin') && pathname !== '/admin/login')

  if (isMainRoute && !loggedIn) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from auth pages
  if (loggedIn && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next({ request })
}
