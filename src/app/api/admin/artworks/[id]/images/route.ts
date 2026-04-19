import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function isAdmin(request: NextRequest) {
  return !!request.cookies.get('cy_admin')
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const imgType = (formData.get('type') as string) || 'detail'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Get current max sort_order for this artwork
  const { data: existing } = await supabaseAdmin
    .from('artwork_images')
    .select('sort_order')
    .eq('artwork_id', params.id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

  // Upload to Supabase Storage
  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `artworks/${params.id}/${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { error: uploadError } = await supabaseAdmin.storage
    .from('artwork-images')
    .upload(fileName, buffer, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  // Build proxied URL
  const imageUrl = `/api/image?path=${encodeURIComponent(fileName)}`

  // Insert into artwork_images
  const { data, error } = await supabaseAdmin
    .from('artwork_images')
    .insert({
      artwork_id: params.id,
      url: imageUrl,
      type: imgType,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json()

  // Extract storage path from proxied URL
  // URL format: /api/image?path=artworks/...
  const urlObj = new URL(url, 'http://localhost')
  const storagePath = urlObj.searchParams.get('path')

  if (storagePath) {
    await supabaseAdmin.storage.from('artwork-images').remove([storagePath])
  }

  // Delete from artwork_images table
  const { error } = await supabaseAdmin
    .from('artwork_images')
    .delete()
    .eq('artwork_id', params.id)
    .eq('url', url)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
