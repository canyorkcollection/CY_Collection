import { NextResponse } from 'next/server'

export async function GET() {
  const response = NextResponse.redirect(new URL('/admin/login', process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('supabase.co', 'vercel.app') || 'http://localhost:3000/admin/login'))
  response.cookies.set('cy_admin', '', { maxAge: 0, path: '/' })
  return response
}

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set('cy_admin', '', { maxAge: 0, path: '/' })
  return response
}
