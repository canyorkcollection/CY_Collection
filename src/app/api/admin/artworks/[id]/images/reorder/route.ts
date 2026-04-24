import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function isAdmin(req: NextRequest) { return !!req.cookies.get('cy_admin') }

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { order } = await request.json()

  // Update sort_order and ensure first image is always 'gallery', rest are 'detail'
  for (let i = 0; i < order.length; i++) {
    const item = order[i]
    await supabaseAdmin
      .from('artwork_images')
      .update({
        sort_order: i,
        type: i === 0 ? 'gallery' : 'detail',
      })
      .eq('artwork_id', id)
      .eq('url', item.url)
  }

  return NextResponse.json({ ok: true })
}
