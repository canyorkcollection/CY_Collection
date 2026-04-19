import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'cy_session'
const ADMIN_COOKIE = 'cy_admin'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protected visitor routes
  if (
    pathname.startsWith('/gallery') ||
    pathname.startsWith('/artists') ||
    pathname.startsWith('/contact')
  ) {
    const session = request.cookies.get(SESSION_COOKIE)
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Protected admin routes — skip /admin/login itself to avoid redirect loop
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const admin = request.cookies.get(ADMIN_COOKIE)
    if (!admin) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/gallery/:path*', '/artists/:path*', '/contact/:path*', '/admin/:path*'],
}
