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
