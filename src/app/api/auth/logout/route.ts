import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.get('host')}` || 'http://localhost:3000'
  const res = NextResponse.redirect(new URL('/login', baseUrl))
  res.cookies.delete('cy_session')
  return res
}
