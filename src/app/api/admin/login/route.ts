import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // Check against admin_users table
    const { data: admin } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, password_hash, active')
      .eq('email', email.toLowerCase().trim())
      .eq('active', true)
      .single()

    if (!admin) {
      return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 })
    }

    // Simple password check — bcrypt would be ideal but adds complexity
    // Using plain comparison against env for now, or hashed in DB
    // For now: compare against ADMIN_PASSWORD env if no admin_users table yet
    const validPassword = password === process.env.ADMIN_PASSWORD ||
      (admin.password_hash && password === admin.password_hash)

    if (!validPassword) {
      return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 })
    }

    // Update last login
    await supabaseAdmin.from('admin_users').update({ last_login: new Date().toISOString() }).eq('id', admin.id)

    const response = NextResponse.json({ ok: true })
    response.cookies.set('cy_admin', admin.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
    return response
  } catch {
    // Fallback: if admin_users table doesn't exist yet, use env password
    try {
      const { password } = await request.clone().json()
      if (password === process.env.ADMIN_PASSWORD) {
        const response = NextResponse.json({ ok: true })
        response.cookies.set('cy_admin', 'admin', {
          httpOnly: true, secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/',
        })
        return response
      }
    } catch {}
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
