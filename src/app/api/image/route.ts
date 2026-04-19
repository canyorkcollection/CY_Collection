import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path')
  const width = req.nextUrl.searchParams.get('w')

  if (!path) return new NextResponse('No path', { status: 400 })

  const { data, error } = await supabaseAdmin.storage
    .from('artwork-images')
    .download(path)

  if (error || !data) return new NextResponse('Not found', { status: 404 })

  const buffer = Buffer.from(await data.arrayBuffer())
  const ext = path.split('.').pop()?.toLowerCase()
  const isPng = ext === 'png'
  const isWebp = ext === 'webp'
  const contentType = isPng ? 'image/png' : isWebp ? 'image/webp' : 'image/jpeg'

  // Resize if width requested and sharp is available
  if (width) {
    try {
      const sharp = (await import('sharp')).default
      const w = Math.min(parseInt(width), 2000) // cap at 2000px

      let pipeline = sharp(buffer).resize(w, null, {
        withoutEnlargement: true,
        fit: 'inside',
      })

      let resized: Buffer
      let outContentType: string

      if (isPng) {
        resized = await pipeline.png({ quality: 85, compressionLevel: 8 }).toBuffer()
        outContentType = 'image/png'
      } else {
        resized = await pipeline.jpeg({ quality: 82, progressive: true }).toBuffer()
        outContentType = 'image/jpeg'
      }

      return new NextResponse(resized, {
        headers: {
          'Content-Type': outContentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    } catch {
      // sharp not available — fall through to original
    }
  }

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
