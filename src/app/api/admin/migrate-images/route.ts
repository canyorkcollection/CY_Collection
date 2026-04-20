import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function isAdmin(request: NextRequest) {
  return !!request.cookies.get('cy_admin')
}

const WP_BASE = 'https://hakancollection-11a43be.netsolhost.com/wp-content/uploads'

const artworkImagesJan = [
  { folder: '001', files: ['001-d01.jpg', '001-d02.jpg', '001-d03.jpg', '001-d04.jpg'] },
  { folder: '002', files: ['002-d01.jpg', '002-d02.jpg', '002-d03.jpg'] },
  { folder: '003', files: ['003-d01.jpg', '003-d02.jpg', '003-d03.jpg'] },
  { folder: '004', files: ['004-d01.jpg', '004-d02.jpg', '004-d03.jpg'] },
  { folder: '005', files: ['005-d01.jpg', '005-d02.jpg', '005-d03.jpg', '005-d04.jpg', '005-d05.jpg'] },
  { folder: '006', files: ['006-d01.jpg', '006-d02.jpg'] },
  { folder: '007', files: ['007-d01.jpg', '007-d02.jpg', '007-d03.jpg'] },
  { folder: '008', files: ['008-d01.jpg', '008-d02.jpg', '008-d03.jpg'] },
  { folder: '009', files: ['009_d01.jpg', '009_d02.jpg', '009_d03.jpg', '009_d04.jpg'] },
  { folder: '010', files: ['010_d01.jpg', '010_d02.jpg', '010_d03.jpg'] },
  { folder: '011', files: ['11-d01.jpg', '11-d02.jpg', '11-d03.jpg'] },
  { folder: '012', files: ['012_d01.jpg', '012_d02.jpg', '012_d03.jpg'] },
  { folder: '013', files: ['013_d01.jpg', '013_d02.jpg', '013_d03.jpg'] },
  { folder: '014', files: ['014_d01.jpg', '014_d02.jpg', '014_d03.jpg'] },
  { folder: '015', files: ['015_d01.jpg', '015_d02.jpg', '015_d03.jpg'] },
]

const artworkImagesFeb = [
  { folder: '016', files: ['016_d01.jpg', '016_d02.jpg', '016_d03.jpg'] },
  { folder: '017', files: ['017_d01.jpg', '017_d02.jpg', '017_d03.jpg', '017_d04.jpg'] },
  { folder: '018', files: ['018_d01-1.jpg', '018_d02.jpg'] },
  { folder: '019', files: ['019_d01.jpg', '019_d02.jpg'] },
]

const artistPhotosJan = [
  'carlos_vega.webp', 'bob_knox.jpg', 'Leslie-Wayne.jpeg',
  'Keith_Mayerson-BW.jpg', 'Hank_Willis_Thomas.jpg', 'Jason-fox.jpg',
  'TomBurckhardt.jpg', 'Laura-Sharp-Wilson.jpg', 'Brad-Kahlhamer.jpg',
  'thordis-adalsteinsdottir.jpeg', 'W-S.jpg',
]

const artistPhotosFeb = [
  'Sean-Mellyn.png', 'Alexi-Worth-.jpeg', 'Tim-Lokiec-.jpg',
  'Jason-Middlebrook.png', 'Chris-Hammerlein.jpg', 'Don-Porcaro-610x787-1.jpg',
  'Joseph-Stashkevetch.jpg', 'Kurt-Lightner.png',
  'PHOT-robert-and-shana-parkeharrison-1.jpg', 'Julie-Heffernan.jpg',
  'James-Hyde.png', 'Nuno-de-Campos.png', 'Justin-Lieberman-scaled.jpg',
  'Lesley-Dill.jpg', 'claudette-schreuders.jpg', 'Kerry-James-Marshall.jpg',
  'Richard-Hambleton.jpg',
]

const photoToArtist: Record<string, string> = {
  'carlos_vega.webp': 'Carlos Vega',
  'bob_knox.jpg': 'Bob Knox',
  'Leslie-Wayne.jpeg': 'Leslie Wayne',
  'Keith_Mayerson-BW.jpg': 'Keith Mayerson',
  'Hank_Willis_Thomas.jpg': 'Hank Willis Thomas',
  'Jason-fox.jpg': 'Jason Fox',
  'TomBurckhardt.jpg': 'Tom Burckhardt',
  'Laura-Sharp-Wilson.jpg': 'Laura Sharp-Wilson',
  'Brad-Kahlhamer.jpg': 'Brad Kahlhamer',
  'thordis-adalsteinsdottir.jpeg': 'Thordis Adalsteinsdottir',
  'W-S.jpg': 'W-S',
  'Sean-Mellyn.png': 'Sean Mellyn',
  'Alexi-Worth-.jpeg': 'Alexi Worth',
  'Tim-Lokiec-.jpg': 'Tim Lokiec',
  'Jason-Middlebrook.png': 'Jason Middlebrook',
  'Chris-Hammerlein.jpg': 'Chris Hammerlein',
  'Don-Porcaro-610x787-1.jpg': 'Don Porcaro',
  'Joseph-Stashkevetch.jpg': 'Joseph Stashkevetch',
  'Kurt-Lightner.png': 'Kurt Lightner',
  'PHOT-robert-and-shana-parkeharrison-1.jpg': 'Robert & Shana ParkeHarrison',
  'Julie-Heffernan.jpg': 'Julie Heffernan',
  'James-Hyde.png': 'James Hyde',
  'Nuno-de-Campos.png': 'Nuno de Campos',
  'Justin-Lieberman-scaled.jpg': 'Justin Lieberman',
  'Lesley-Dill.jpg': 'Lesley Dill',
  'claudette-schreuders.jpg': 'Claudette Schreuders',
  'Kerry-James-Marshall.jpg': 'Kerry James Marshall',
  'Richard-Hambleton.jpg': 'Richard Hambleton',
}

async function downloadAndUpload(url: string, storagePath: string): Promise<boolean> {
  try {
    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) return false
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await res.arrayBuffer())
    const { error } = await supabaseAdmin.storage
      .from('artwork-images')
      .upload(storagePath, buffer, { contentType, upsert: true })
    return !error
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = { uploaded: 0, failed: 0, dbUpdated: 0, errors: [] as string[] }

  await supabaseAdmin.storage.updateBucket('artwork-images', { public: true })

  const { data: artworks } = await supabaseAdmin
    .from('artworks')
    .select('id, title, sort_order')
    .order('sort_order')

  if (!artworks?.length) {
    return NextResponse.json({ error: 'No artworks found' }, { status: 400 })
  }

  const artworkBySort: Record<number, string> = {}
  for (const aw of artworks) {
    artworkBySort[aw.sort_order] = aw.id
  }

  // Delete all existing artwork_images
  await supabaseAdmin.from('artwork_images').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // Upload artwork images
  const allFolders = [
    ...artworkImagesJan.map(f => ({ ...f, month: '01' })),
    ...artworkImagesFeb.map(f => ({ ...f, month: '02' })),
  ]

  for (const { folder, files, month } of allFolders) {
    const sortNum = parseInt(folder)
    const artworkId = artworkBySort[sortNum]
    if (!artworkId) {
      results.errors.push(`No artwork for folder ${folder} (sort_order ${sortNum})`)
      continue
    }

    for (let i = 0; i < files.length; i++) {
      const filename = files[i]
      const wpUrl = `${WP_BASE}/2026/${month}/${filename}`
      const storagePath = `artworks/${filename}`
      const imgType = i === 0 ? 'gallery' : 'detail'

      const ok = await downloadAndUpload(wpUrl, storagePath)
      if (ok) {
        results.uploaded++
        const imageUrl = `/api/image?path=${encodeURIComponent(storagePath)}`
        const { error } = await supabaseAdmin
          .from('artwork_images')
          .insert({ artwork_id: artworkId, url: imageUrl, type: imgType, sort_order: i })
        if (error) results.errors.push(`DB error ${filename}: ${error.message}`)
        else results.dbUpdated++
      } else {
        results.failed++
        results.errors.push(`Upload failed: ${filename}`)
      }
    }
  }

  // Upload artist photos
  const allPhotos = [
    ...artistPhotosJan.map(f => ({ file: f, month: '01' })),
    ...artistPhotosFeb.map(f => ({ file: f, month: '02' })),
  ]

  const { data: artists } = await supabaseAdmin.from('artists').select('id, name')

  for (const { file, month } of allPhotos) {
    const artistName = photoToArtist[file]
    if (!artistName) { results.errors.push(`No mapping for ${file}`); continue }

    const artist = artists?.find(a => a.name === artistName)
    if (!artist) { results.errors.push(`Artist "${artistName}" not found`); continue }

    const wpUrl = `${WP_BASE}/2026/${month}/${file}`
    const ext = file.split('.').pop() || 'jpg'
    const storagePath = `artists/${artist.id}/photo.${ext}`

    const ok = await downloadAndUpload(wpUrl, storagePath)
    if (ok) {
      results.uploaded++
      const photoUrl = `/api/image?path=${encodeURIComponent(storagePath)}`
      const { error } = await supabaseAdmin.from('artists').update({ photo_url: photoUrl }).eq('id', artist.id)
      if (error) results.errors.push(`Artist DB error ${artistName}: ${error.message}`)
      else results.dbUpdated++
    } else {
      results.failed++
      results.errors.push(`Artist photo failed: ${file}`)
    }
  }

  return NextResponse.json(results)
}
