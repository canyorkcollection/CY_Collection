'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import Nav from '@/components/ui/Nav'

type Image = { url: string; type: string; sort_order: number }
type Artist = { id: string; name: string; bio_short: string; nationality: string; birth_year: number }
type Artwork = {
  id: string; title: string; year: number; medium: string; support: string
  width_cm: number; height_cm: number; catalog_number: string; collection: string
  condition: string; signature: string; provenance: string; notes: string
  artist: Artist; images: Image[]
}

const WALL_H = 440
const MAX_W = 400

function thumbUrl(url: string, w: number) {
  return url?.startsWith('/api/image') ? `${url}&w=${w}` : url
}
function isPng(url: string) {
  return url?.toLowerCase().includes('.png')
}

function useImageDims(url: string | undefined) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    if (!url) return
    const img = new window.Image()
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = thumbUrl(url, 400)
  }, [url])
  return dims
}

function computeSize(nw: number, nh: number) {
  const ratio = nw / nh
  let w = MAX_W, h = Math.round(w / ratio)
  if (h > WALL_H) { h = WALL_H; w = Math.round(h * ratio) }
  if (w > MAX_W) { w = MAX_W; h = Math.round(w / ratio) }
  return { w, h }
}

function ArtworkCard({ artwork, onClick }: { artwork: Artwork; onClick: () => void }) {
  const sorted = [...(artwork.images || [])].sort((a, b) => a.sort_order - b.sort_order)
  const img = sorted.find(i => i.type === 'gallery')?.url || sorted[0]?.url
  const dims = useImageDims(img)
  const [hover, setHover] = useState(false)

  const { w, h } = dims ? computeSize(dims.w, dims.h) : { w: 280, h: 360 }

  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
      <div style={{ width: '1px', height: '52px', background: 'var(--border-mid)' }} />
      <div style={{
        width: `${w}px`, height: `${h}px`,
        background: isPng(img || '') ? 'transparent' : 'var(--bg-warm)',
        overflow: 'hidden',
        boxShadow: hover
          ? '0 6px 24px rgba(0,0,0,0.13), 0 16px 48px rgba(0,0,0,0.09)'
          : '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.07)',
        transform: hover ? 'translateY(-4px)' : 'none',
        transition: 'box-shadow 0.3s, transform 0.3s',
      }}>
        {img && (
          <img src={thumbUrl(img, 800)} alt={artwork.title} style={{
            width: '100%', height: '100%', display: 'block',
            objectFit: isPng(img) ? 'contain' : 'cover',
          }} />
        )}
      </div>
      <div style={{ marginTop: '18px', textAlign: 'center', width: `${w}px`, opacity: hover ? 1 : 0.8, transition: 'opacity 0.2s' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
          {artwork.artist?.name}
        </p>
        <p style={{ fontSize: '16px', fontFamily: 'var(--font-display)', color: 'var(--text)' }}>{artwork.title}</p>
        <p style={{ fontSize: '13px', color: 'var(--text-faint)', marginTop: '2px' }}>{artwork.year}</p>
      </div>
    </div>
  )
}

function ZoomViewer({ src, alt }: { src: string; alt: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const MIN_ZOOM = 1; const MAX_ZOOM = 5

  const clamp = useCallback((x: number, y: number, z: number) => {
    const el = containerRef.current
    if (!el) return { x, y }
    const r = el.getBoundingClientRect()
    return {
      x: Math.max(-(r.width * (z - 1)) / 2, Math.min((r.width * (z - 1)) / 2, x)),
      y: Math.max(-(r.height * (z - 1)) / 2, Math.min((r.height * (z - 1)) / 2, y)),
    }
  }, [])

  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + (e.deltaY > 0 ? -0.4 : 0.4)))
    setZoom(nz)
    if (nz === MIN_ZOOM) setPos({ x: 0, y: 0 })
    else setPos(p => clamp(p.x, p.y, nz))
  }
  function onMouseDown(e: React.MouseEvent) {
    if (zoom <= 1) return
    setDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return
    setPos(clamp(dragStart.current.px + e.clientX - dragStart.current.mx, dragStart.current.py + e.clientY - dragStart.current.my, zoom))
  }
  function onMouseUp() { setDragging(false) }

  const lastDist = useRef<number | null>(null)
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastDist.current = Math.sqrt(dx * dx + dy * dy)
    } else if (zoom > 1) {
      dragStart.current = { mx: e.touches[0].clientX, my: e.touches[0].clientY, px: pos.x, py: pos.y }
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault()
    if (e.touches.length === 2 && lastDist.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const d = Math.sqrt(dx * dx + dy * dy)
      const delta = (d - lastDist.current) * 0.012
      lastDist.current = d
      setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)))
    } else if (zoom > 1) {
      setPos(clamp(dragStart.current.px + e.touches[0].clientX - dragStart.current.mx, dragStart.current.py + e.touches[0].clientY - dragStart.current.my, zoom))
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} onWheel={onWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={() => { lastDist.current = null }}
        style={{ width: '100%', height: '100%', overflow: 'hidden', cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default', touchAction: 'none' }}>
        <img src={src} alt={alt} draggable={false} style={{
          width: '100%', height: '100%', objectFit: 'contain',
          transform: `scale(${zoom}) translate(${pos.x / zoom}px, ${pos.y / zoom}px)`,
          transformOrigin: 'center', transition: dragging ? 'none' : 'transform 0.1s',
          userSelect: 'none',
        }} />
      </div>
      {zoom === 1 && (
        <div style={{
          position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          fontSize: '13px', color: 'var(--text-faint)', background: 'rgba(244,242,237,0.9)',
          padding: '7px 16px', pointerEvents: 'none',
        }}>Scroll to zoom · drag to pan</div>
      )}
      {zoom > 1 && (
        <button onClick={() => { setZoom(1); setPos({ x: 0, y: 0 }) }} style={{
          position: 'absolute', bottom: '20px', right: '20px', padding: '8px 16px',
          background: 'var(--bg)', border: '1px solid var(--border-mid)',
          cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)',
        }}>Reset zoom</button>
      )}
    </div>
  )
}

export default function GalleryWalk({ artworks }: { artworks: Artwork[] }) {
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<Artwork | null>(null)
  const [activeImg, setActiveImg] = useState(0)
  const [maxOffset, setMaxOffset] = useState(1)
  const wallRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startOffset = useRef(0)
  const touchStartX = useRef(0)
  const touchStartOffset = useRef(0)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function getMax() {
    if (!wallRef.current || !containerRef.current) return 1
    const m = Math.max(1, wallRef.current.scrollWidth - containerRef.current.clientWidth)
    setMaxOffset(m)
    return m
  }

  function step(dir: number) {
    setOffset(o => Math.max(0, Math.min(getMax(), o + dir * 480)))
  }

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true; startX.current = e.clientX; startOffset.current = offset; e.preventDefault()
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return
    setOffset(Math.max(0, Math.min(getMax(), startOffset.current + (startX.current - e.clientX))))
  }
  function onMouseUp() { dragging.current = false }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX; touchStartOffset.current = offset
  }
  function onTouchMove(e: React.TouchEvent) {
    setOffset(Math.max(0, Math.min(getMax(), touchStartOffset.current + (touchStartX.current - e.touches[0].clientX))))
  }

  const progress = maxOffset > 1 ? (offset / maxOffset) * 100 : 0

  function detailImgs(a: Artwork) {
    return [...(a.images || [])].sort((x, y) => x.sort_order - y.sort_order)
  }

  return (
    <>
      <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Nav />

        {/* Wall */}
        <div ref={containerRef}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove}
          style={{ flex: 1, overflow: 'hidden', cursor: 'grab', position: 'relative', userSelect: 'none' }}>
          {/* Floor line */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: '88px', height: '1px', background: 'var(--border)', zIndex: 2 }} />
          <div ref={wallRef} style={{
            display: 'flex', alignItems: 'flex-end', gap: '110px', padding: '40px 160px 88px',
            transform: `translateX(-${offset}px)`,
            transition: dragging.current ? 'none' : 'transform 0.55s cubic-bezier(0.25,0.46,0.45,0.94)',
          }}>
            {artworks.map(a => (
              <ArtworkCard key={a.id} artwork={a} onClick={() => { setSelected(a); setActiveImg(0) }} />
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          height: '64px', background: 'var(--bg)', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '24px', padding: '0 48px',
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', flexShrink: 0 }}>{artworks.length} works</span>
          <div style={{ flex: 1, height: '3px', background: 'var(--border)', cursor: 'pointer', position: 'relative' }}
            onClick={e => {
              const r = e.currentTarget.getBoundingClientRect()
              setOffset(Math.round(((e.clientX - r.left) / r.width) * getMax()))
            }}>
            <div style={{ height: '100%', background: 'var(--text)', width: `${progress}%`, transition: 'width 0.15s' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {[['←', -1], ['→', 1]].map(([a, d]) => (
              <button key={String(a)} onClick={() => step(Number(d))} style={{
                width: '40px', height: '40px', border: '1px solid var(--border-mid)',
                background: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--text-muted)',
              }}>{a}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Detail overlay */}
      {selected && (() => {
        const imgs = detailImgs(selected)
        const currentUrl = imgs[activeImg]?.url || imgs[0]?.url
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', background: 'var(--bg-panel)', animation: 'cy-fade 0.18s ease' }}>
            <style>{`@keyframes cy-fade { from { opacity:0 } to { opacity:1 } }`}</style>

            {/* LEFT — metadata */}
            <div style={{
              width: '360px', flexShrink: 0, borderRight: '1px solid var(--border)',
              padding: '40px 36px', display: 'flex', flexDirection: 'column',
              overflowY: 'auto', background: 'var(--bg)',
            }}>
              <button onClick={() => setSelected(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                fontSize: '14px', color: 'var(--text-muted)', marginBottom: '36px', padding: 0,
              }}>← Back</button>

              {selected.catalog_number && (
                <p style={{ fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '10px' }}>
                  {selected.catalog_number}
                </p>
              )}
              <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>{selected.title}</h1>
              <a href="/artists" style={{
                fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none',
                borderBottom: '1px solid var(--border)', paddingBottom: '2px',
                marginBottom: '32px', display: 'inline-block',
              }}>{selected.artist?.name}</a>

              <div style={{ borderTop: '1px solid var(--border)' }}>
                {([
                  ['Year', selected.year],
                  ['Medium', selected.medium],
                  ['Dimensions', selected.width_cm && selected.height_cm ? `${selected.width_cm} × ${selected.height_cm} cm` : null],
                  ['Support', selected.support],
                  ['Condition', selected.condition],
                  ['Signature', selected.signature],
                  ['Collection', selected.collection],
                  ['Provenance', selected.provenance],
                ] as [string, string | number | null][]).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid var(--border)', gap: '16px' }}>
                    <span style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', flexShrink: 0 }}>{k}</span>
                    <span style={{ fontSize: '14px', color: 'var(--text)', textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>

              {selected.artist?.bio_short && (
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.75', marginTop: '24px' }}>
                  {selected.artist.bio_short}
                </p>
              )}
              {selected.notes && (
                <p style={{ fontSize: '13px', color: 'var(--text-faint)', lineHeight: '1.65', marginTop: '16px', fontStyle: 'italic' }}>
                  {selected.notes}
                </p>
              )}
            </div>

            {/* RIGHT — image */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-warm)' }}>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {currentUrl && <ZoomViewer src={currentUrl} alt={selected.title} key={currentUrl} />}
              </div>
              {imgs.length > 1 && (
                <div style={{ display: 'flex', gap: '10px', padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg)', overflowX: 'auto' }}>
                  {imgs.map((img, i) => (
                    <div key={i} onClick={() => setActiveImg(i)} style={{
                      width: '68px', height: '68px', flexShrink: 0, overflow: 'hidden',
                      cursor: 'pointer', background: 'var(--bg-warm)',
                      outline: i === activeImg ? '2px solid var(--text)' : '2px solid transparent',
                      outlineOffset: '2px', opacity: i === activeImg ? 1 : 0.5, transition: 'opacity 0.2s',
                    }}>
                      <img src={thumbUrl(img.url, 136)} alt="" style={{ width: '100%', height: '100%', objectFit: isPng(img.url) ? 'contain' : 'cover', display: 'block' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </>
  )
}
