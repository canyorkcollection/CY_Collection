import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { hashPassword } from '@/lib/auth'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!
const ADMIN_COOKIE = 'cy_admin'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(ADMIN_COOKIE, hashPassword(ADMIN_PASSWORD), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
