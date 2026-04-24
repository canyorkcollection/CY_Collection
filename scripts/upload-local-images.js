#!/usr/bin/env node
/**
 * CAN YORK — Upload local images to Supabase Storage
 *
 * Usage:
 *   node scripts/upload-local-images.js
 *
 * This script:
 * 1. Reads images from local folder
 * 2. Converts to base64
 * 3. Calls /api/admin/upload-images to upload and update DB
 *
 * Prerequisites:
 * - Run from the CY_Collection project root
 * - Have NEXT_PUBLIC_SUPABASE_URL set in .env.local
 * - Be logged in as admin (cy_admin cookie)
 */

const fs = require('fs')
const path = require('path')

// ============================================================
// CONFIG - Adjust these paths
// ============================================================
const LOCAL_IMAGES_ROOT = process.argv[2] || '/Users/isaac/Documents/ISAAC/Sweet & Vicious/FOTOS OBRA ARTE/web'
const APP_URL = process.argv[3] || 'http://localhost:3000'
const ADMIN_COOKIE = process.argv[4] || ''  // Set this to your cy_admin cookie value

// ============================================================
// MAPPING: artwork sort_order → local folder + expected files
// This maps the NEW sort_order (from WordPress catalog order) to local folders
// ============================================================
const artworkImageMap = {
  // WP sort_order 1: Prince Andrei (local folder 010)
  1:  { folder: '10',  files: ['010_d01.jpg', '010_d02.jpg', '010_d03.jpg'] },
  // WP sort_order 2: Me and the Twins (local folder 018)
  2:  { folder: '018', files: ['018_d01.jpg', '018_d02.jpg'] },
  // WP sort_order 3: ISmell Glue (local folder 019)
  3:  { folder: '019', files: ['019_d01.jpg', '019_d02.jpg'] },
  // WP sort_order 4: Pope and Hamster Net (local folder 017)
  4:  { folder: '017', files: ['017_d01.jpg', '017_d02.jpg', '017_d03.jpg', '017_d04.jpg'] },
  // WP sort_order 5: Misconduct (local folder 016)
  5:  { folder: '016', files: ['016_d01.jpg', '016_d02.jpg', '016_d03.jpg'] },
  // WP sort_order 6: The Darkroom #2 (local folder 015)
  6:  { folder: '015', files: ['015_d01.jpg', '015_d02.jpg', '015_d03.jpg'] },
  // WP sort_order 7: Owen in Bathtub (local folder 014)
  7:  { folder: '014', files: ['014_d01.jpg', '014_d02.jpg', '014_d03.jpg'] },
  // WP sort_order 8: Hurt Money (local folder 013)
  8:  { folder: '013', files: ['013_d01.jpg', '013_d02.jpg', '013_d03.jpg'] },
  // WP sort_order 9: What I Live For (local folder 012)
  9:  { folder: '012', files: ['012_d01.jpg', '012_d02.jpg', '012_d03.jpg'] },
  // WP sort_order 10: Build More Prisons (local folder 011)
  10: { folder: '011', files: ['11-d01.jpg', '11-d02.jpg', '11-d03.jpg'] },
  // WP sort_order 11: (four feet)² (local folder 003)
  11: { folder: '003', files: ['003-d01.jpg', '003-d02.jpg', '003-d03.jpg'] },
  // WP sort_order 12: Barcode (local folder 009)
  12: { folder: '09',  files: ['009_d01.jpg', '009_d02.jpg', '009_d03.jpg', '009_d04.jpg'] },
  // WP sort_order 13: Accident #3 & #4 (local folder 005)
  13: { folder: '005', files: ['005-d01.jpg', '005-d02.jpg', '005-d03.jpg', '005-d04.jpg', '005-d05.jpg'] },
  // WP sort_order 14: Abductee (local folder 008)
  14: { folder: '008', files: ['008-d01.jpg', '008-d02.jpg', '008-d03.jpg'] },
  // WP sort_order 15: unknown - Isaac Alcober (local folder 007)
  15: { folder: '007', files: ['007-d01.jpg', '007-d02.jpg', '007-d03.jpg'] },
  // WP sort_order 16: Redeployment (local folder 004)
  16: { folder: '004', files: ['004-d01.jpg', '004-d02.jpg', '004-d03.jpg'] },
  // WP sort_order 17: Unknown - Isaac Alcober (local folder 002)
  17: { folder: '002', files: ['002-d01.jpg', '002-d02.jpg', '002-d03.jpg'] },
  // WP sort_order 18: Soho Below (local folder 001)
  18: { folder: '001-d01', files: ['001-d01.jpg', '001-d02.jpg', '001-d03.jpg', '001-d04.jpg'] },
  // WP sort_order 19: Sans Titre - Isaac Alcober (uses 02_ files from WP)
  //   Note: local folder 002 has the 002-dXX files. Sans Titre uses 02_G02 etc from WP.
  //   You'll need to provide these manually or skip this entry.
  19: { folder: '__SKIP__', files: [] },

  // NEW artworks (sort_order 20-26) - will need data from you
  20: { folder: '020 (falta entrar)', files: ['020_d01.jpg', '020_d02.jpg', '020_d03.jpg'] },
  21: { folder: '021 (falta entrar)', files: ['021_d01.jpg', '021_d02.jpg', '021_d03.jpg'] },
  22: { folder: '022', files: ['022_d01.jpg', '022_d02.jpg', '022_d03.jpg', '022_d04.jpg'] },
  23: { folder: '023', files: ['023_d01.jpg', '023_d02.jpg', '023_d03.jpg', '023_d04.jpg'] },
  24: { folder: '024', files: ['024_d01.jpg', '024_d02.jpg', '024_d03.jpg'] },
  25: { folder: '025', files: ['025_d01.jpg', '025_d02.jpg', '025_d03.jpg'] },
  26: { folder: '026', files: ['026_d01.jpg', '026_d02.jpg', '026_d03.jpg'] },
}

async function main() {
  console.log('CAN YORK — Upload Local Images')
  console.log('==============================')
  console.log(`Local images: ${LOCAL_IMAGES_ROOT}`)
  console.log(`App URL: ${APP_URL}`)
  console.log()

  if (!ADMIN_COOKIE) {
    console.error('ERROR: You must provide the cy_admin cookie value as the 4th argument')
    console.error('  Get it from your browser DevTools > Application > Cookies > cy_admin')
    console.error()
    console.error('Usage: node scripts/upload-local-images.js <images-path> <app-url> <admin-cookie>')
    process.exit(1)
  }

  // Build the images array
  const images = []

  for (const [sortOrderStr, mapping] of Object.entries(artworkImageMap)) {
    const sortOrder = parseInt(sortOrderStr)
    const { folder, files } = mapping

    if (folder === '__SKIP__') {
      console.log(`Skipping sort_order ${sortOrder} (needs manual handling)`)
      continue
    }

    const folderPath = path.join(LOCAL_IMAGES_ROOT, folder)

    for (let i = 0; i < files.length; i++) {
      const filename = files[i]
      const filePath = path.join(folderPath, filename)

      if (!fs.existsSync(filePath)) {
        console.warn(`  WARNING: File not found: ${filePath}`)
        continue
      }

      const fileBuffer = fs.readFileSync(filePath)
      const base64Data = fileBuffer.toString('base64')
      const type = i === 0 ? 'gallery' : 'detail'

      images.push({
        filename,
        data: base64Data,
        artworkSortOrder: sortOrder,
        type,
        sortOrder: i,
      })

      console.log(`  Queued: ${filename} → artwork sort_order=${sortOrder}, type=${type}, img_sort=${i}`)
    }
  }

  console.log(`\nTotal images to upload: ${images.length}`)

  if (images.length === 0) {
    console.error('No images found. Check your LOCAL_IMAGES_ROOT path.')
    process.exit(1)
  }

  // Upload in batches of 10 to avoid payload size limits
  const BATCH_SIZE = 10
  let totalUploaded = 0
  let totalFailed = 0
  let totalDbUpdated = 0
  const allErrors = []

  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE)
    console.log(`\nUploading batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(images.length / BATCH_SIZE)}...`)

    try {
      const response = await fetch(`${APP_URL}/api/admin/upload-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `cy_admin=${ADMIN_COOKIE}`,
        },
        body: JSON.stringify({ images: batch }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error(`  API Error: ${result.error}`)
        allErrors.push(`Batch error: ${result.error}`)
        totalFailed += batch.length
        continue
      }

      totalUploaded += result.uploaded || 0
      totalFailed += result.failed || 0
      totalDbUpdated += result.dbUpdated || 0
      if (result.errors) allErrors.push(...result.errors)

      console.log(`  Uploaded: ${result.uploaded}, Failed: ${result.failed}, DB updated: ${result.dbUpdated}`)
    } catch (err) {
      console.error(`  Fetch error: ${err.message}`)
      totalFailed += batch.length
    }
  }

  console.log('\n==============================')
  console.log('FINAL RESULTS')
  console.log('==============================')
  console.log(`Uploaded:   ${totalUploaded}`)
  console.log(`Failed:     ${totalFailed}`)
  console.log(`DB Updated: ${totalDbUpdated}`)
  if (allErrors.length > 0) {
    console.log(`\nErrors:`)
    allErrors.forEach(e => console.log(`  - ${e}`))
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
