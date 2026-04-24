import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function isAdmin(req: NextRequest) { return !!req.cookies.get('cy_admin') }

/**
 * POST /api/admin/upload-images
 *
 * Upload images from local filesystem to Supabase Storage and update DB.
 * This is meant to be run ONCE to replace all artwork images with local versions.
 *
 * Body: { images: [{ filename, data (base64), artworkSortOrder, type, sortOrder }] }
 *
 * The route will:
 * 1. Upload each image to Supabase Storage bucket "artwork-images"
 * 2. Delete existing artwork_images for the artwork
 * 3. Insert new artwork_images with correct URLs
 */
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { images } = await request.json()
  if (!images || !Array.isArray(images)) {
    return NextResponse.json({ error: 'images array required' }, { status: 400 })
  }

  const results = { uploaded: 0, failed: 0, dbUpdated: 0, errors: [] as string[] }

  // Get all artworks
  const { data: artworks } = await supabaseAdmin.from('artworks').select('id, sort_order, title').order('sort_order')
  if (!artworks?.length) return NextResponse.json({ error: 'No artworks in DB' }, { status: 400 })

  const artworkBySort: Record<number, string> = {}
  for (const aw of artworks) artworkBySort[aw.sort_order] = aw.id

  for (const img of images) {
    const { filename, data, artworkSortOrder, type, sortOrder } = img
    const artworkId = artworkBySort[artworkSortOrder]

    if (!artworkId) {
      results.errors.push(`No artwork for sort_order ${artworkSortOrder} (${filename})`)
      results.failed++
      continue
    }

    // Decode base64
    const buffer = Buffer.from(data, 'base64')

    // Determine content type
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg'
    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    }
    const contentType = contentTypes[ext] || 'image/jpeg'

    // Upload to Storage
    const storagePath = `artworks/${filename}`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('artwork-images')
      .upload(storagePath, buffer, { contentType, upsert: true })

    if (uploadError) {
      results.errors.push(`Upload failed ${filename}: ${uploadError.message}`)
      results.failed++
      continue
    }

    results.uploaded++

    // Update DB: upsert artwork_images
    const imageUrl = `/api/image?path=${encodeURIComponent(storagePath)}`
    const { error: dbError } = await supabaseAdmin
      .from('artwork_images')
      .upsert(
        { artwork_id: artworkId, url: imageUrl, type, sort_order: sortOrder },
        { onConflict: 'artwork_id,url' }
      )

    if (dbError) {
      results.errors.push(`DB error ${filename}: ${dbError.message}`)
    } else {
      results.dbUpdated++
    }
  }

  return NextResponse.json(results)
}

/**
 * DELETE /api/admin/upload-images
 * Remove all artwork_images and re-create from scratch.
 * Use with caution!
 */
export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('artwork_images')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: data?.length || 0 })
}
