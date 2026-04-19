#!/bin/bash
# ============================================================
# CAN YORK Collection — Script de actualización
# Ejecutar desde: /Users/isaac/Documents/ISAAC/VIBECODE/CAN-YORK
#
# Uso:
#   cd /Users/isaac/Documents/ISAAC/VIBECODE/CAN-YORK
#   bash update-canyork.sh
#
# Este script:
#   1. Sobrescribe los archivos con las correcciones
#   2. Elimina proxy.ts (reemplazado por middleware.ts)
#   3. Hace git add + commit + push
# ============================================================

set -e

echo "=== CAN YORK Collection — Actualización ==="
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
  echo "ERROR: Ejecuta este script desde el directorio raíz del proyecto"
  echo "  cd /Users/isaac/Documents/ISAAC/VIBECODE/CAN-YORK"
  exit 1
fi

echo "1. Eliminando proxy.ts (reemplazado por middleware.ts)..."
rm -f src/proxy.ts

echo "2. Creando middleware.ts..."
mkdir -p src
cat > src/middleware.ts << 'ENDOFFILE'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'cy_session'
const ADMIN_COOKIE = 'cy_admin'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protected visitor routes
  if (
    pathname.startsWith('/gallery') ||
    pathname.startsWith('/artists') ||
    pathname.startsWith('/contact')
  ) {
    const session = request.cookies.get(SESSION_COOKIE)
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Protected admin routes — skip /admin/login itself to avoid redirect loop
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const admin = request.cookies.get(ADMIN_COOKIE)
    if (!admin) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/gallery/:path*', '/artists/:path*', '/contact/:path*', '/admin/:path*'],
}
ENDOFFILE

echo "3. Actualizando src/lib/auth.ts..."
cat > src/lib/auth.ts << 'ENDOFFILE'
import { cookies } from 'next/headers'
import { supabaseAdmin } from './supabase'
import { createHash } from 'crypto'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!
const SESSION_COOKIE = 'cy_session'
const ADMIN_COOKIE = 'cy_admin'

export function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex')
}

export async function getVisitorSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  // Check invitation token
  const { data: invitation } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('active', true)
    .single()

  if (invitation) return { type: 'invitation', invitation }

  // Check client password
  const hash = hashPassword(token)
  const { data: cp } = await supabaseAdmin
    .from('client_passwords')
    .select('*, invitations(*)')
    .eq('password_hash', hash)
    .single()

  if (cp) return { type: 'client', data: cp }

  return null
}

export async function getAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value
  if (!token) return false
  // Validate that the cookie value matches the hashed ADMIN_PASSWORD
  return token === hashPassword(ADMIN_PASSWORD)
}

export function isValidAdminPassword(password: string) {
  return password === ADMIN_PASSWORD
}
ENDOFFILE

echo "4. Actualizando src/lib/supabase.ts..."
cat > src/lib/supabase.ts << 'ENDOFFILE'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
ENDOFFILE

echo "5. Actualizando src/app/api/admin/login/route.ts..."
mkdir -p src/app/api/admin/login
cat > src/app/api/admin/login/route.ts << 'ENDOFFILE'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { hashPassword } from '@/lib/auth'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!
const ADMIN_COOKIE = 'cy_admin'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(ADMIN_COOKIE, hashPassword(ADMIN_PASSWORD), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
ENDOFFILE

echo "6. Actualizando src/app/api/admin/logout/route.ts..."
mkdir -p src/app/api/admin/logout
cat > src/app/api/admin/logout/route.ts << 'ENDOFFILE'
import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set('cy_admin', '', { maxAge: 0, path: '/' })
  return response
}
ENDOFFILE

echo "7. Actualizando src/app/api/admin/artists/[id]/route.ts..."
mkdir -p "src/app/api/admin/artists/[id]"
cat > "src/app/api/admin/artists/[id]/route.ts" << 'ENDOFFILE'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function isAdmin(req: NextRequest) { return !!req.cookies.get('cy_admin') }

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json()
  const { data, error } = await supabaseAdmin
    .from('artists').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { error } = await supabaseAdmin.from('artists').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
ENDOFFILE

echo "8. Actualizando src/app/api/admin/artists/[id]/photo/route.ts..."
mkdir -p "src/app/api/admin/artists/[id]/photo"
cat > "src/app/api/admin/artists/[id]/photo/route.ts" << 'ENDOFFILE'
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
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `artists/${id}/photo.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { error: uploadError } = await supabaseAdmin.storage
    .from('artwork-images')
    .upload(fileName, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const photoUrl = `/api/image?path=${encodeURIComponent(fileName)}`

  const { data, error } = await supabaseAdmin
    .from('artists')
    .update({ photo_url: photoUrl })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ photo_url: data.photo_url })
}
ENDOFFILE

echo "9. Creando src/app/api/admin/artworks/route.ts (nuevo endpoint)..."
mkdir -p src/app/api/admin/artworks
cat > src/app/api/admin/artworks/route.ts << 'ENDOFFILE'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function isAdmin(req: NextRequest) { return !!req.cookies.get('cy_admin') }

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabaseAdmin
    .from('artworks')
    .select(`*, artist:artists(id, name), images:artwork_images(url, type, sort_order)`)
    .order('sort_order', { ascending: true })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  if (!body.title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('artworks')
    .insert({
      title: body.title,
      artist_id: body.artist_id || null,
      year: body.year || null,
      medium: body.medium || null,
      support: body.support || null,
      width_cm: body.width_cm || null,
      height_cm: body.height_cm || null,
      catalog_number: body.catalog_number || null,
      collection: body.collection || null,
      condition: body.condition || null,
      signature: body.signature || null,
      provenance: body.provenance || null,
      notes: body.notes || null,
      visible: body.visible ?? true,
      sort_order: body.sort_order || 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
ENDOFFILE

echo "10. Actualizando src/app/api/admin/artworks/[id]/route.ts..."
mkdir -p "src/app/api/admin/artworks/[id]"
cat > "src/app/api/admin/artworks/[id]/route.ts" << 'ENDOFFILE'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function isAdmin(request: NextRequest) {
  return !!request.cookies.get('cy_admin')
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json()
  const { data, error } = await supabaseAdmin
    .from('artworks')
    .update(body)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { error } = await supabaseAdmin.from('artworks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
ENDOFFILE

echo "11. Actualizando src/app/api/admin/artworks/[id]/images/route.ts..."
mkdir -p "src/app/api/admin/artworks/[id]/images"
cat > "src/app/api/admin/artworks/[id]/images/route.ts" << 'ENDOFFILE'
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
  const imgType = (formData.get('type') as string) || 'detail'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const { data: existing } = await supabaseAdmin
    .from('artwork_images')
    .select('sort_order')
    .eq('artwork_id', id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `artworks/${id}/${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { error: uploadError } = await supabaseAdmin.storage
    .from('artwork-images')
    .upload(fileName, buffer, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const imageUrl = `/api/image?path=${encodeURIComponent(fileName)}`

  const { data, error } = await supabaseAdmin
    .from('artwork_images')
    .insert({
      artwork_id: id,
      url: imageUrl,
      type: imgType,
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

  const urlObj = new URL(url, 'http://localhost')
  const storagePath = urlObj.searchParams.get('path')

  if (storagePath) {
    await supabaseAdmin.storage.from('artwork-images').remove([storagePath])
  }

  const { error } = await supabaseAdmin
    .from('artwork_images')
    .delete()
    .eq('artwork_id', id)
    .eq('url', url)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
ENDOFFILE

echo "12. Actualizando src/app/api/admin/artworks/[id]/images/reorder/route.ts..."
mkdir -p "src/app/api/admin/artworks/[id]/images/reorder"
cat > "src/app/api/admin/artworks/[id]/images/reorder/route.ts" << 'ENDOFFILE'
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
ENDOFFILE

echo "13. Actualizando src/app/api/admin/invitations/[id]/route.ts..."
mkdir -p "src/app/api/admin/invitations/[id]"
cat > "src/app/api/admin/invitations/[id]/route.ts" << 'ENDOFFILE'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function isAdminAuthenticated(request: NextRequest) {
  return !!request.cookies.get('cy_admin')
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json()
  const { data, error } = await supabaseAdmin
    .from('invitations')
    .update(body)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { error } = await supabaseAdmin.from('invitations').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
ENDOFFILE

echo "14. Actualizando src/app/api/image/route.ts..."
mkdir -p src/app/api/image
cat > src/app/api/image/route.ts << 'ENDOFFILE'
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

  if (width) {
    try {
      const sharp = (await import('sharp')).default
      const w = Math.min(parseInt(width), 2000)

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

      return new NextResponse(new Uint8Array(resized), {
        headers: {
          'Content-Type': outContentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    } catch {
      // sharp not available — fall through to original
    }
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
ENDOFFILE

echo "15. Actualizando src/app/(admin)/admin/login/page.tsx..."
mkdir -p "src/app/(admin)/admin/login"
cat > "src/app/(admin)/admin/login/page.tsx" << 'ENDOFFILE'
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
    if (!password) { setError('Please enter the admin password.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) router.push('/admin')
      else { const d = await res.json(); setError(d.error || 'Incorrect password.') }
    } catch { setError('Connection error. Try again.') }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px', border: '1px solid #D4CFC9',
    background: '#FAF9F6', fontSize: '15px', outline: 'none', color: '#1C1A17',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#F0EDE8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: '380px', padding: '0 24px' }}>
        <p style={{ fontSize: '24px', fontFamily: 'Georgia, serif', marginBottom: '6px', color: '#1C1A17' }}>Can York</p>
        <p style={{ fontSize: '13px', color: '#6B6760', marginBottom: '36px' }}>Admin access</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B6760', display: 'block', marginBottom: '6px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoFocus placeholder="Admin password" style={{ ...inputStyle, paddingRight: '48px' }} />
              <button onClick={() => setShowPw(!showPw)} style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#9A9590', fontSize: '18px',
              }}>{showPw ? '○' : '●'}</button>
            </div>
          </div>

          {error && <p style={{ fontSize: '14px', color: '#B03020', background: '#FDF0EE', padding: '10px 14px', border: '1px solid #F0C8C2' }}>{error}</p>}

          <button onClick={handleLogin} disabled={loading} style={{
            padding: '15px', background: '#1C1A17', color: '#F4F2ED', border: 'none',
            cursor: loading ? 'wait' : 'pointer', fontSize: '15px', marginTop: '8px',
            opacity: loading ? 0.7 : 1,
          }}>{loading ? 'Signing in...' : 'Sign in'}</button>
        </div>
      </div>
    </div>
  )
}
ENDOFFILE

echo "16. Actualizando src/components/admin/ArtworksManager.tsx..."
mkdir -p src/components/admin
cat > src/components/admin/ArtworksManager.tsx << 'ENDOFFILE'
'use client'
import { useState } from 'react'

type ArtworkImage = { id?: string; url: string; type: string; sort_order: number }
type ArtworkArtist = { id: string; name: string }
type Artwork = {
  id: string; title: string; year: number; medium: string; support: string
  width_cm: number; height_cm: number; catalog_number: string; collection: string
  condition: string; signature: string; provenance: string; notes: string
  visible: boolean; sort_order: number
  artist: ArtworkArtist; images: ArtworkImage[]
}
type Artist = { id: string; name: string }

const MEDIUM_OPTIONS = [
  'Oil on canvas', 'Oil on linen', 'Oil on panel', 'Oil on paper',
  'Acrylic on canvas', 'Acrylic on linen', 'Acrylic on panel',
  'Watercolor on paper', 'Gouache on paper', 'Pastel on paper',
  'Charcoal on paper', 'Ink on paper', 'Mixed media', 'Photography',
  'Digital print', 'Screen print', 'Lithograph', 'Etching', 'Sculpture', 'Other',
]

const CONDITION_OPTIONS = ['Excellent', 'Very good', 'Good', 'Fair', 'Poor']

function thumbUrl(url: string, w: number) {
  return url?.startsWith('/api/image') ? `${url}&w=${w}` : url
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid #D4CFC9',
  background: '#FAF9F6', fontSize: '14px', color: '#1C1A17', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase',
  color: '#6B6760', display: 'block', marginBottom: '6px',
}

export default function ArtworksManager({ initialArtworks, artists }: { initialArtworks: Artwork[]; artists: Artist[] }) {
  const [artworks, setArtworks] = useState(initialArtworks)
  const [editing, setEditing] = useState<Artwork | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newArtistId, setNewArtistId] = useState('')
  const [creating, setCreating] = useState(false)

  async function createArtwork() {
    if (!newTitle.trim()) return
    setCreating(true)
    const res = await fetch('/api/admin/artworks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), artist_id: newArtistId || null, visible: true }),
    })
    if (res.ok) {
      const artwork = await res.json()
      const detailRes = await fetch(`/api/admin/artworks`)
      if (detailRes.ok) {
        const allArtworks = await detailRes.json()
        setArtworks(allArtworks)
      } else {
        setArtworks(prev => [...prev, { ...artwork, artist: artists.find(a => a.id === newArtistId) || { id: '', name: '' }, images: [] }])
      }
      setNewTitle(''); setNewArtistId(''); setShowCreate(false)
      setEditing({ ...artwork, artist: artists.find(a => a.id === newArtistId) || { id: '', name: '' }, images: [] })
    } else {
      alert('Error creating artwork. Please try again.')
    }
    setCreating(false)
  }

  function startEdit(a: Artwork) { setEditing(JSON.parse(JSON.stringify(a))) }

  function updateField(key: string, val: any) {
    setEditing(e => e ? { ...e, [key]: val } : null)
  }

  async function saveArtwork() {
    if (!editing) return
    setSaving(true)
    const res = await fetch(`/api/admin/artworks/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editing.title, year: Number(editing.year),
        medium: editing.medium, support: editing.support,
        width_cm: Number(editing.width_cm), height_cm: Number(editing.height_cm),
        catalog_number: editing.catalog_number, collection: editing.collection,
        condition: editing.condition, signature: editing.signature,
        provenance: editing.provenance, notes: editing.notes,
        visible: editing.visible, artist_id: editing.artist?.id,
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      setArtworks(prev => prev.map(a => a.id === updated.id
        ? { ...a, ...updated, artist: editing.artist, images: editing.images }
        : a))
      setEditing(null)
    }
    setSaving(false)
  }

  async function toggleVisible(id: string, visible: boolean) {
    const res = await fetch(`/api/admin/artworks/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: !visible }),
    })
    if (res.ok) setArtworks(prev => prev.map(a => a.id === id ? { ...a, visible: !visible } : a))
  }

  async function uploadImage(artworkId: string, file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const currentImages = editing?.images || []
    fd.append('type', currentImages.length === 0 ? 'gallery' : 'detail')
    const res = await fetch(`/api/admin/artworks/${artworkId}/images`, { method: 'POST', body: fd })
    if (res.ok) {
      const img = await res.json()
      setArtworks(prev => prev.map(a => a.id === artworkId ? { ...a, images: [...a.images, img] } : a))
      if (editing?.id === artworkId) setEditing(e => e ? { ...e, images: [...e.images, img] } : null)
    } else {
      alert('Upload failed. Please try again.')
    }
    setUploading(false)
  }

  async function deleteImage(artworkId: string, imageUrl: string) {
    if (!confirm('Delete this image?')) return
    const res = await fetch(`/api/admin/artworks/${artworkId}/images`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl }),
    })
    if (res.ok) {
      const removeImg = (imgs: ArtworkImage[]) => imgs.filter(i => i.url !== imageUrl)
      setArtworks(prev => prev.map(a => a.id === artworkId ? { ...a, images: removeImg(a.images) } : a))
      if (editing?.id === artworkId) setEditing(e => e ? { ...e, images: removeImg(e.images) } : null)
    } else {
      alert('Could not delete image. Try again.')
    }
  }

  async function moveImage(artworkId: string, fromIdx: number, toIdx: number) {
    if (!editing) return
    const imgs = [...editing.images]
    const [moved] = imgs.splice(fromIdx, 1)
    imgs.splice(toIdx, 0, moved)
    const reordered = imgs.map((img, i) => ({ ...img, sort_order: i }))
    setEditing(e => e ? { ...e, images: reordered } : null)
    await fetch(`/api/admin/artworks/${artworkId}/images/reorder`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: reordered.map(i => ({ url: i.url, sort_order: i.sort_order })) }),
    })
  }

  const cover = (a: Artwork) => {
    const sorted = [...a.images].sort((x, y) => x.sort_order - y.sort_order)
    return sorted[0]?.url
  }

  return (
    <div style={{ padding: '40px 48px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: '#1C1A17', fontWeight: 400, marginBottom: '4px' }}>
            Artworks
          </h1>
          <p style={{ fontSize: '14px', color: '#6B6760' }}>
            {artworks.length} works · click any row to edit
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} style={{
          padding: '12px 24px', background: '#1C1A17', color: '#F4F2ED',
          border: 'none', cursor: 'pointer', fontSize: '14px', borderRadius: '6px',
        }}>+ New artwork</button>
      </div>

      {showCreate && (
        <div style={{ background: '#FAF9F6', border: '1px solid #D4CFC9', borderRadius: '8px', padding: '20px 24px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={labelStyle}>Title *</label>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createArtwork()}
              autoFocus placeholder="Artwork title" style={inputStyle} />
          </div>
          <div style={{ minWidth: '180px' }}>
            <label style={labelStyle}>Artist</label>
            <select value={newArtistId} onChange={e => setNewArtistId(e.target.value)} style={inputStyle}>
              <option value="">— Select artist —</option>
              {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <button onClick={createArtwork} disabled={creating} style={{
            padding: '10px 24px', background: '#1C1A17', color: '#F4F2ED',
            border: 'none', cursor: creating ? 'wait' : 'pointer', fontSize: '14px', borderRadius: '4px',
          }}>{creating ? 'Creating…' : 'Create'}</button>
          <button onClick={() => setShowCreate(false)} style={{
            padding: '10px 16px', background: 'none', border: '1px solid #D4CFC9',
            cursor: 'pointer', fontSize: '14px', color: '#6B6760', borderRadius: '4px',
          }}>Cancel</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {artworks.map(a => (
          <div key={a.id} onClick={() => startEdit(a)} style={{
            display: 'flex', alignItems: 'center', gap: '20px',
            padding: '16px 20px', background: '#FAF9F6', border: '1px solid #D4CFC9',
            borderRadius: '8px', cursor: 'pointer', transition: 'box-shadow 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            <div style={{ width: '80px', height: '80px', flexShrink: 0, background: '#EDE9E2', overflow: 'hidden', borderRadius: '4px' }}>
              {cover(a) && <img src={thumbUrl(cover(a)!, 160)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '16px', fontFamily: 'Georgia, serif', color: '#1C1A17', marginBottom: '4px' }}>{a.title}</p>
              <p style={{ fontSize: '13px', color: '#6B6760' }}>{a.artist?.name} · {a.year}</p>
              {a.medium && <p style={{ fontSize: '12px', color: '#9A9590', marginTop: '2px' }}>{a.medium}</p>}
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <p style={{ fontSize: '18px', color: '#1C1A17' }}>{a.images.length}</p>
              <p style={{ fontSize: '11px', color: '#9A9590' }}>images</p>
            </div>
            <div onClick={e => { e.stopPropagation(); toggleVisible(a.id, a.visible) }}
              style={{ flexShrink: 0, cursor: 'pointer' }}>
              <div style={{
                width: '44px', height: '24px', background: a.visible ? '#2A6E47' : '#D4CFC9',
                borderRadius: '12px', position: 'relative', transition: 'background 0.2s',
              }}>
                <div style={{
                  position: 'absolute', top: '3px', left: a.visible ? '23px' : '3px',
                  width: '18px', height: '18px', background: 'white', borderRadius: '50%',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
              <p style={{ fontSize: '11px', color: '#9A9590', textAlign: 'center', marginTop: '3px' }}>
                {a.visible ? 'Visible' : 'Hidden'}
              </p>
            </div>
            <span style={{ fontSize: '18px', color: '#9A9590', flexShrink: 0 }}>›</span>
          </div>
        ))}
      </div>

      {editing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={() => setEditing(null)} style={{ flex: 1, background: 'rgba(28,26,23,0.3)' }} />
          <div style={{
            width: '560px', background: '#FAF9F6', borderLeft: '1px solid #D4CFC9',
            overflowY: 'auto', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #E8E4DE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#FAF9F6', zIndex: 1 }}>
              <h2 style={{ fontSize: '18px', fontFamily: 'Georgia, serif', fontWeight: 400, color: '#1C1A17' }}>
                Edit artwork
              </h2>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: '#9A9590', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Images ({editing.images.length})</label>
                <p style={{ fontSize: '12px', color: '#9A9590', marginBottom: '12px' }}>
                  First image = gallery view. Drag to reorder. Click × to delete.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                  {[...editing.images].sort((a, b) => a.sort_order - b.sort_order).map((img, i) => (
                    <div key={i}
                      draggable
                      onDragStart={e => e.dataTransfer.setData('idx', String(i))}
                      onDragOver={e => { e.preventDefault(); setDragOver(i) }}
                      onDrop={e => { e.preventDefault(); const from = Number(e.dataTransfer.getData('idx')); moveImage(editing.id, from, i); setDragOver(null) }}
                      onDragLeave={() => setDragOver(null)}
                      style={{
                        position: 'relative', width: '96px', height: '96px',
                        background: '#EDE9E2', cursor: 'grab', borderRadius: '4px',
                        outline: dragOver === i ? '2px solid #1C1A17' : 'none',
                        overflow: 'hidden',
                      }}>
                      <img src={thumbUrl(img.url, 192)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{
                        position: 'absolute', top: '4px', left: '4px', width: '20px', height: '20px',
                        background: 'rgba(28,26,23,0.7)', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', color: 'white',
                      }}>{i + 1}</div>
                      <button onClick={() => deleteImage(editing.id, img.url)} style={{
                        position: 'absolute', top: '4px', right: '4px', width: '22px', height: '22px',
                        background: 'rgba(176,48,32,0.85)', border: 'none', borderRadius: '50%',
                        cursor: 'pointer', color: 'white', fontSize: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>×</button>
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'rgba(28,26,23,0.6)', padding: '3px 6px',
                        fontSize: '10px', color: 'white', textAlign: 'center',
                      }}>{i === 0 ? 'Cover' : 'Detail'}</div>
                    </div>
                  ))}
                  <label style={{
                    width: '96px', height: '96px', border: '2px dashed #D4CFC9',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', borderRadius: '4px', color: '#9A9590', gap: '6px',
                    background: uploading ? '#F0EDE8' : 'none',
                  }}>
                    <span style={{ fontSize: '24px' }}>{uploading ? '⏳' : '+'}</span>
                    <span style={{ fontSize: '11px' }}>{uploading ? 'Uploading…' : 'Add image'}</span>
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                      onChange={async e => {
                        const files = Array.from(e.target.files || [])
                        for (const file of files) await uploadImage(editing.id, file)
                        e.target.value = ''
                      }} />
                  </label>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #E8E4DE' }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '14px', color: '#1C1A17' }}>Visible in gallery</p>
                  <p style={{ fontSize: '12px', color: '#9A9590' }}>Toggle to show or hide this artwork</p>
                </div>
                <div onClick={() => updateField('visible', !editing.visible)} style={{ cursor: 'pointer' }}>
                  <div style={{
                    width: '48px', height: '26px', background: editing.visible ? '#2A6E47' : '#D4CFC9',
                    borderRadius: '13px', position: 'relative', transition: 'background 0.2s',
                  }}>
                    <div style={{
                      position: 'absolute', top: '3px', left: editing.visible ? '25px' : '3px',
                      width: '20px', height: '20px', background: 'white', borderRadius: '50%',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #E8E4DE' }} />

              <div>
                <label style={labelStyle}>Artist</label>
                <select value={editing.artist?.id || ''} onChange={e => {
                  const a = artists.find(ar => ar.id === e.target.value)
                  setEditing(ed => ed ? { ...ed, artist: a || ed.artist } : null)
                }} style={inputStyle}>
                  <option value="">— Select artist —</option>
                  {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Title</label>
                  <input value={editing.title || ''} onChange={e => updateField('title', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Year</label>
                  <input type="number" value={editing.year || ''} onChange={e => updateField('year', Number(e.target.value))} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Medium</label>
                <select value={editing.medium || ''} onChange={e => updateField('medium', e.target.value)} style={inputStyle}>
                  <option value="">— Select medium —</option>
                  {MEDIUM_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input value={editing.medium || ''} onChange={e => updateField('medium', e.target.value)}
                  placeholder="Or type custom medium…"
                  style={{ ...inputStyle, marginTop: '6px', fontSize: '13px', color: '#6B6760' }} />
              </div>

              <div>
                <label style={labelStyle}>Dimensions (cm)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <input type="number" step="0.1" placeholder="Width cm" value={editing.width_cm || ''} onChange={e => updateField('width_cm', Number(e.target.value))} style={inputStyle} />
                  </div>
                  <div>
                    <input type="number" step="0.1" placeholder="Height cm" value={editing.height_cm || ''} onChange={e => updateField('height_cm', Number(e.target.value))} style={inputStyle} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Support</label>
                  <input value={editing.support || ''} onChange={e => updateField('support', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Condition</label>
                  <select value={editing.condition || ''} onChange={e => updateField('condition', e.target.value)} style={inputStyle}>
                    <option value="">—</option>
                    {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Catalog #</label>
                  <input value={editing.catalog_number || ''} onChange={e => updateField('catalog_number', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Collection</label>
                  <input value={editing.collection || ''} onChange={e => updateField('collection', e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Signature</label>
                <input value={editing.signature || ''} onChange={e => updateField('signature', e.target.value)} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Provenance</label>
                <textarea value={editing.provenance || ''} onChange={e => updateField('provenance', e.target.value)}
                  rows={2} style={{ ...inputStyle, resize: 'none', lineHeight: '1.5' }} />
              </div>

              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={editing.notes || ''} onChange={e => updateField('notes', e.target.value)}
                  rows={3} style={{ ...inputStyle, resize: 'none', lineHeight: '1.5' }} />
              </div>
            </div>

            <div style={{ padding: '20px 28px', borderTop: '1px solid #E8E4DE', background: '#FAF9F6', position: 'sticky', bottom: 0 }}>
              <button onClick={saveArtwork} disabled={saving} style={{
                width: '100%', padding: '15px', background: '#1C1A17', color: '#F4F2ED',
                border: 'none', cursor: saving ? 'wait' : 'pointer',
                fontSize: '15px', borderRadius: '4px',
                opacity: saving ? 0.7 : 1,
              }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
ENDOFFILE

echo "17. Actualizando package.json (sin AWS SDK)..."
cat > package.json << 'ENDOFFILE'
{
  "name": "can-york",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@supabase/ssr": "^0.10.0",
    "@supabase/supabase-js": "^2.101.1",
    "next": "16.2.2",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "sharp": "^0.34.5"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.2",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
ENDOFFILE

echo "18. Creando supabase-setup.sql..."
cat > supabase-setup.sql << 'ENDOFFILE'
-- ============================================================
-- CAN YORK — Complete Migration — Run in Supabase SQL Editor
-- Run this FIRST before deploying the app
-- ============================================================

-- 1. Artists table
CREATE TABLE IF NOT EXISTS artists (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  bio_short   TEXT,
  bio_long    TEXT,
  nationality TEXT,
  birth_year  INTEGER,
  death_year  INTEGER,
  photo_url   TEXT,
  website     TEXT,
  instagram   TEXT,
  visible     BOOLEAN DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Artworks table
CREATE TABLE IF NOT EXISTS artworks (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id      UUID REFERENCES artists(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  year           INTEGER,
  medium         TEXT,
  support        TEXT,
  width_cm       NUMERIC(10,1),
  height_cm      NUMERIC(10,1),
  catalog_number TEXT,
  collection     TEXT,
  condition      TEXT,
  signature      TEXT,
  provenance     TEXT,
  notes          TEXT,
  visible        BOOLEAN DEFAULT TRUE,
  sort_order     INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Artwork images table
CREATE TABLE IF NOT EXISTS artwork_images (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artwork_id  UUID REFERENCES artworks(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  type        TEXT DEFAULT 'detail',
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token            TEXT UNIQUE NOT NULL,
  email            TEXT,
  label            TEXT,
  active           BOOLEAN DEFAULT TRUE,
  used_at          TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Client passwords table (for visitor access codes)
CREATE TABLE IF NOT EXISTS client_passwords (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  password_hash TEXT UNIQUE NOT NULL,
  label         TEXT,
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Contact info table (singleton)
CREATE TABLE IF NOT EXISTS contact_info (
  id          SERIAL PRIMARY KEY,
  email       TEXT,
  phone       TEXT,
  address     TEXT,
  city        TEXT,
  hours       TEXT,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default contact info row
INSERT INTO contact_info (email, city, hours, description)
SELECT 'info@canyork.com', 'Ibiza, Spain', 'By appointment', 'For inquiries about artworks, acquisitions, and private viewings.'
WHERE NOT EXISTS (SELECT 1 FROM contact_info);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('artwork-images', 'artwork-images', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'artwork-images');

CREATE POLICY "Allow service upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'artwork-images' AND auth.role() = 'service_role');

CREATE POLICY "Allow service update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'artwork-images' AND auth.role() = 'service_role');

CREATE POLICY "Allow service delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'artwork-images' AND auth.role() = 'service_role');

-- ============================================================
-- ENABLE RLS
-- ============================================================

ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read visible artists" ON artists FOR SELECT USING (visible = true OR auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON artists FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read visible artworks" ON artworks FOR SELECT USING (visible = true OR auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON artworks FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE artwork_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read artwork images" ON artwork_images FOR SELECT USING (true);
CREATE POLICY "Service role full access" ON artwork_images FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON invitations FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE client_passwords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON client_passwords FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE contact_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read contact" ON contact_info FOR SELECT USING (true);
CREATE POLICY "Service role full access" ON contact_info FOR ALL USING (auth.role() = 'service_role');
ENDOFFILE

echo ""
echo "=== Archivos actualizados ==="
echo ""
echo "Ahora ejecuta:"
echo ""
echo "  rm -rf node_modules package-lock.json"
echo "  npm install"
echo "  git add -A"
echo "  git commit -m 'fix: all critical bugs - middleware, params Promise, admin auth, new artwork endpoint'"
echo "  git push origin main"
echo ""
echo "=== Variables de entorno en Vercel ==="
echo "  NEXT_PUBLIC_SUPABASE_URL = https://ortkzfjorpcatnocbuwk.supabase.co"
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_phbLz6y1ajbfauIY9TNCqg_eSHY-mSC"
echo "  SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ydGt6ZmpvcnBjYXRub2NidXdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjYxNTMxMSwiZXhwIjoyMDkyMTkxMzExfQ.KhCeAUUh_7QnzEx2g4sYvraGvZg248lYrRvKGPeeSac"
echo "  ADMIN_PASSWORD = (tu contraseña de admin)"
echo ""
echo "=== También ejecuta supabase-setup.sql en el SQL Editor de Supabase ==="
echo "  https://supabase.com/dashboard/project/ortkzfjorpcatnocbuwk/sql"
echo ""
