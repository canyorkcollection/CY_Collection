import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function isAdmin(req: NextRequest) { return !!req.cookies.get('cy_admin') }

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { order } = await request.json()
  for (const item of order) {
    await supabaseAdmin
      .from('artwork_images')
      .update({ sort_order: item.sort_order })
      .eq('artwork_id', id)
      .eq('url', item.url)
  }
  return NextResponse.json({ ok: true })
}
