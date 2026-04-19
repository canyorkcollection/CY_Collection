import { createClient } from '@supabase/supabase-js'
import https from 'https'
import http from 'http'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const images = [
  '003-d01.jpg', '003-d02.jpg', '003-d03.jpg',
  '001-d01.jpg', '001-d02.jpg', '001-d03.jpg', '001-d04.jpg',
  '004-d01.jpg', '004-d02.jpg', '004-d03.jpg',
  '002-d01.jpg', '002-d02.jpg', '002-d03.jpg',
  '005-d01.jpg', '005-d02.jpg', '005-d03.jpg', '005-d04.jpg', '005-d05.jpg',
  '006-d01.jpg', '006-d02.jpg',
  '007-d01.jpg', '007-d02.jpg', '007-d03.jpg',
  '008-d01.jpg', '008-d02.jpg', '008-d03.jpg',
  '009_d01.jpg', '009_d02.jpg', '009_d03.jpg', '009_d04.jpg',
  '010_d01.jpg', '010_d02.jpg', '010_d03.jpg',
  '11-d01.jpg',  '11-d02.jpg',  '11-d03.jpg',
  '012_d01.jpg', '012_d02.jpg', '012_d03.jpg',
  '013_d01.jpg', '013_d02.jpg', '013_d03.jpg',
  '014_d01.jpg', '014_d02.jpg', '014_d03.jpg',
  '015_d01.jpg', '015_d02.jpg', '015_d03.jpg',
]

const images_feb = [
  '016_d01.jpg', '016_d02.jpg', '016_d03.jpg',
  '017_d01.jpg', '017_d02.jpg', '017_d03.jpg', '017_d04.jpg',
  '018_d01-1.jpg', '018_d02.jpg',
  '019_d01.jpg', '019_d02.jpg',
]

const artists_imgs = [
  'carlos_vega.webp', 'bob_knox.jpg', 'Leslie-Wayne.jpeg',
  'Keith_Mayerson-BW.jpg', 'Hank_Willis_Thomas.jpg', 'Jason-fox.jpg',
  'TomBurckhardt.jpg', 'Laura-Sharp-Wilson.jpg', 'Brad-Kahlhamer.jpg',
  'thordis-adalsteinsdottir.jpeg', 'W-S.jpg',
]

const artists_imgs_feb = [
  'Sean-Mellyn.png', 'Alexi-Worth-.jpeg', 'Tim-Lokiec-.jpg',
  'Jason-Middlebrook.png', 'Chris-Hammerlein.jpg', 'Don-Porcaro-610x787-1.jpg',
  'Joseph-Stashkevetch.jpg', 'Kurt-Lightner.png',
  'PHOT-robert-and-shana-parkeharrison-1.jpg', 'Julie-Heffernan.jpg',
  'James-Hyde.png', 'Nuno-de-Campos.png', 'Justin-Lieberman-scaled.jpg',
  'Lesley-Dill.jpg', 'claudette-schreuders.jpg', 'Kerry-James-Marshall.jpg',
  'Richard-Hambleton.jpg',
]

function download(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location).then(resolve).catch(reject)
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] }))
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function uploadImage(filename, url, folder) {
  try {
    console.log(`Downloading ${filename}...`)
    const { buffer, contentType } = await download(url)
    const path = `${folder}/${filename}`
    const { error } = await supabase.storage
      .from('artwork-images')
      .upload(path, buffer, {
        contentType: contentType || 'image/jpeg',
        upsert: true,
      })
    if (error) {
      console.error(`  ✗ Upload failed: ${error.message}`)
    } else {
      console.log(`  ✓ ${path}`)
    }
  } catch (err) {
    console.error(`  ✗ Error with ${filename}: ${err.message}`)
  }
}

async function main() {
  console.log('Starting image migration...\n')
  const base = 'https://hakancollection-11a43be.netsolhost.com/wp-content/uploads'
  for (const img of images) {
    await uploadImage(img, `${base}/2026/01/${img}`, 'artworks')
  }
  for (const img of images_feb) {
    await uploadImage(img, `${base}/2026/02/${img}`, 'artworks')
  }
  for (const img of artists_imgs) {
    await uploadImage(img, `${base}/2026/01/${img}`, 'artists')
  }
  for (const img of artists_imgs_feb) {
    await uploadImage(img, `${base}/2026/02/${img}`, 'artists')
  }
  console.log('\nDone!')
}

main()
