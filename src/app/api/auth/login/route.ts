import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'

const SESSION_COOKIE = 'cy_session'

export async function POST(req: NextRequest) {
  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'No code provided' }, { status: 400 })

  const trimmed = code.trim()

  // Check invitation token
  const { data: invitation } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('token', trimmed)
    .single()

  if (invitation) {
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 403 })
    }

    // Mark as used
    await supabaseAdmin
      .from('invitations')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invitation.id)

    const res = NextResponse.json({ ok: true })
    res.cookies.set(SESSION_COOKIE, trimmed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
    return res
  }

  // Check client password
  const hash = hashPassword(trimmed)
  const { data: cp } = await supabaseAdmin
    .from('client_passwords')
    .select('*')
    .eq('password_hash', hash)
    .single()

  if (cp) {
    const res = NextResponse.json({ ok: true })
    res.cookies.set(SESSION_COOKIE, trimmed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    return res
  }

  return NextResponse.json({ error: 'Invalid code or password' }, { status: 401 })
}
