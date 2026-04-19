import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function isAdmin(req: NextRequest) { return !!req.cookies.get('cy_admin') }

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabaseAdmin
    .from('artworks')
    .select(`*, artist:artists(id, name), images:artwork_images(url, type, sort_order)`)
    .order('sort_order', { ascending: true })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  if (!body.title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('artworks')
    .insert({
      title: body.title,
      artist_id: body.artist_id || null,
      year: body.year || null,
      medium: body.medium || null,
      support: body.support || null,
      width_cm: body.width_cm || null,
      height_cm: body.height_cm || null,
      catalog_number: body.catalog_number || null,
      collection: body.collection || null,
      condition: body.condition || null,
      signature: body.signature || null,
      provenance: body.provenance || null,
      notes: body.notes || null,
      visible: body.visible ?? true,
      sort_order: body.sort_order || 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
