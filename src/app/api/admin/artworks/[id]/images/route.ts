import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function isAdmin(request: NextRequest) {
  return !!request.cookies.get('cy_admin')
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const imgType = (formData.get('type') as string) || null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Get current images for this artwork
  const { data: existing } = await supabaseAdmin
    .from('artwork_images')
    .select('sort_order, type')
    .eq('artwork_id', id)
    .order('sort_order', { ascending: false })

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

  // Auto-detect type: first image = gallery, rest = detail
  // (unless explicitly provided)
  const type = imgType || (existing && existing.length === 0 ? 'gallery' : 'detail')

  // Sanitize filename: use original name or generate a clean one
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const contentTypes: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  }
  const contentType = contentTypes[ext] || 'image/jpeg'

  // Use flat path: artworks/{artwork_id}_{sort_order}_{timestamp}.{ext}
  // This is consistent and avoids nested folders
  const fileName = `artworks/${id}_${nextOrder}_${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { error: uploadError } = await supabaseAdmin.storage
    .from('artwork-images')
    .upload(fileName, buffer, { contentType, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const imageUrl = `/api/image?path=${encodeURIComponent(fileName)}`

  const { data, error } = await supabaseAdmin
    .from('artwork_images')
    .insert({
      artwork_id: id,
      url: imageUrl,
      type,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { url } = await request.json()

  // Delete from Storage
  const urlObj = new URL(url, 'http://localhost')
  const storagePath = urlObj.searchParams.get('path')

  if (storagePath) {
    await supabaseAdmin.storage.from('artwork-images').remove([storagePath])
  }

  // Delete from DB
  const { error } = await supabaseAdmin
    .from('artwork_images')
    .delete()
    .eq('artwork_id', id)
    .eq('url', url)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // After deletion, ensure the first remaining image is type='gallery'
  const { data: remaining } = await supabaseAdmin
    .from('artwork_images')
    .select('id, type, sort_order')
    .eq('artwork_id', id)
    .order('sort_order', { ascending: true })

  if (remaining && remaining.length > 0) {
    // Renumber sort_order and ensure first is gallery
    const updates = remaining.map((img, i) => ({
      id: img.id,
      type: i === 0 ? 'gallery' : 'detail',
      sort_order: i,
    }))

    for (const upd of updates) {
      await supabaseAdmin
        .from('artwork_images')
        .update({ type: upd.type, sort_order: upd.sort_order })
        .eq('id', upd.id)
    }
  }

  return NextResponse.json({ ok: true })
}
