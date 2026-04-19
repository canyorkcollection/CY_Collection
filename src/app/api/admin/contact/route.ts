import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function isAdmin(req: NextRequest) { return !!req.cookies.get('cy_admin') }

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabaseAdmin.from('contact_info').select('*').single()
  return NextResponse.json(data || {})
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { data: existing } = await supabaseAdmin.from('contact_info').select('id').single()
  let result
  if (existing) {
    result = await supabaseAdmin.from('contact_info').update({ ...body, updated_at: new Date().toISOString() }).eq('id', existing.id).select().single()
  } else {
    result = await supabaseAdmin.from('contact_info').insert(body).select().single()
  }
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json(result.data)
}
