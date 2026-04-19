import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function isAdmin(req: NextRequest) { return !!req.cookies.get('cy_admin') }

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { order } = await request.json()
  // order: [{ url: string, sort_order: number }]
  for (const item of order) {
    await supabaseAdmin
      .from('artwork_images')
      .update({ sort_order: item.sort_order })
      .eq('artwork_id', params.id)
      .eq('url', item.url)
  }
  return NextResponse.json({ ok: true })
}
