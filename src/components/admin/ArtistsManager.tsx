'use client'
import { useState } from 'react'

type Artist = {
  id: string; name: string; bio_short?: string; bio_long?: string
  nationality?: string; birth_year?: number; death_year?: number
  photo_url?: string; website?: string; instagram?: string; visible: boolean
}

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

export default function ArtistsManager({ initialArtists }: { initialArtists: Artist[] }) {
  const [artists, setArtists] = useState(initialArtists)
  const [editing, setEditing] = useState<Artist | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  function startEdit(a: Artist) { setEditing(JSON.parse(JSON.stringify(a))) }
  function updateField(key: string, val: any) { setEditing(e => e ? { ...e, [key]: val } : null) }

  async function createArtist() {
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/admin/artists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), visible: true }),
    })
    if (res.ok) {
      const artist = await res.json()
      setArtists(prev => [...prev, artist])
      setNewName(''); setShowCreate(false)
      setEditing(artist) // Open edit panel immediately
    }
    setCreating(false)
  }

  async function saveArtist() {
    if (!editing) return
    setSaving(true)
    const res = await fetch(`/api/admin/artists/${editing.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editing.name, bio_short: editing.bio_short || null,
        bio_long: editing.bio_long || null, nationality: editing.nationality || null,
        birth_year: editing.birth_year || null, death_year: editing.death_year || null,
        website: editing.website || null, instagram: editing.instagram || null,
        visible: editing.visible,
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      setArtists(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a))
      setEditing(null)
    }
    setSaving(false)
  }

  async function uploadPhoto(artistId: string, file: File) {
    setUploadingPhoto(true)
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch(`/api/admin/artists/${artistId}/photo`, { method: 'POST', body: fd })
    if (res.ok) {
      const { photo_url } = await res.json()
      setArtists(prev => prev.map(a => a.id === artistId ? { ...a, photo_url } : a))
      if (editing?.id === artistId) setEditing(e => e ? { ...e, photo_url } : null)
    }
    setUploadingPhoto(false)
  }

  async function toggleVisible(id: string, visible: boolean) {
    const res = await fetch(`/api/admin/artists/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: !visible }),
    })
    if (res.ok) setArtists(prev => prev.map(a => a.id === id ? { ...a, visible: !visible } : a))
  }

  return (
    <div style={{ padding: '40px 48px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: '#1C1A17', fontWeight: 400, marginBottom: '4px' }}>Artists</h1>
          <p style={{ fontSize: '14px', color: '#6B6760' }}>{artists.length} artists · click to edit</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} style={{
          padding: '12px 24px', background: '#1C1A17', color: '#F4F2ED',
          border: 'none', cursor: 'pointer', fontSize: '14px', borderRadius: '6px',
        }}>+ New artist</button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: '#FAF9F6', border: '1px solid #D4CFC9', borderRadius: '8px', padding: '20px 24px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Artist name</label>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createArtist()}
              autoFocus placeholder="e.g. Joan Miró" style={inputStyle} />
          </div>
          <button onClick={createArtist} disabled={creating} style={{
            padding: '10px 24px', background: '#1C1A17', color: '#F4F2ED',
            border: 'none', cursor: creating ? 'wait' : 'pointer', fontSize: '14px', borderRadius: '4px',
          }}>{creating ? 'Creating…' : 'Create'}</button>
          <button onClick={() => setShowCreate(false)} style={{
            padding: '10px 16px', background: 'none', border: '1px solid #D4CFC9',
            cursor: 'pointer', fontSize: '14px', color: '#6B6760', borderRadius: '4px',
          }}>Cancel</button>
        </div>
      )}

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {artists.map(a => (
          <div key={a.id} onClick={() => startEdit(a)} style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            padding: '16px 20px', background: '#FAF9F6', border: '1px solid #D4CFC9',
            borderRadius: '8px', cursor: 'pointer', transition: 'box-shadow 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            {/* Photo */}
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#EDE9E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {a.photo_url
                ? <img src={thumbUrl(a.photo_url, 104)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '18px', color: '#9A9590' }}>{a.name?.[0]}</span>
              }
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '16px', fontFamily: 'Georgia, serif', color: '#1C1A17', marginBottom: '2px' }}>{a.name}</p>
              <p style={{ fontSize: '13px', color: '#9A9590' }}>
                {[a.nationality, a.birth_year && `b. ${a.birth_year}`].filter(Boolean).join(' · ')}
              </p>
            </div>

            {/* Visible */}
            <div onClick={e => { e.stopPropagation(); toggleVisible(a.id, a.visible) }} style={{ flexShrink: 0, cursor: 'pointer' }}>
              <div style={{ width: '44px', height: '24px', background: a.visible ? '#2A6E47' : '#D4CFC9', borderRadius: '12px', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: '3px', left: a.visible ? '23px' : '3px', width: '18px', height: '18px', background: 'white', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </div>

            <span style={{ fontSize: '18px', color: '#9A9590' }}>›</span>
          </div>
        ))}
      </div>

      {/* Edit panel */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={() => setEditing(null)} style={{ flex: 1, background: 'rgba(28,26,23,0.3)' }} />
          <div style={{ width: '520px', background: '#FAF9F6', borderLeft: '1px solid #D4CFC9', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            <div style={{ padding: '24px 28px', borderBottom: '1px solid #E8E4DE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#FAF9F6', zIndex: 1 }}>
              <h2 style={{ fontSize: '18px', fontFamily: 'Georgia, serif', fontWeight: 400 }}>Edit artist</h2>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: '#9A9590' }}>×</button>
            </div>

            <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Photo */}
              <div>
                <label style={labelStyle}>Photo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', background: '#EDE9E2', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {editing.photo_url
                      ? <img src={thumbUrl(editing.photo_url, 144)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: '24px', color: '#9A9590' }}>{editing.name?.[0]}</span>
                    }
                  </div>
                  <label style={{ padding: '10px 18px', border: '1px solid #D4CFC9', cursor: 'pointer', fontSize: '13px', color: '#6B6760', borderRadius: '4px', background: '#F0EDE8' }}>
                    {uploadingPhoto ? 'Uploading…' : 'Change photo'}
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadPhoto(editing.id, f); e.target.value = '' }} />
                  </label>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #E8E4DE' }} />

              {/* Visible */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '14px', color: '#1C1A17' }}>Visible to visitors</p>
                <div onClick={() => updateField('visible', !editing.visible)} style={{ cursor: 'pointer' }}>
                  <div style={{ width: '48px', height: '26px', background: editing.visible ? '#2A6E47' : '#D4CFC9', borderRadius: '13px', position: 'relative', transition: 'background 0.2s' }}>
                    <div style={{ position: 'absolute', top: '3px', left: editing.visible ? '25px' : '3px', width: '20px', height: '20px', background: 'white', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #E8E4DE' }} />

              {/* Name */}
              <div>
                <label style={labelStyle}>Name *</label>
                <input value={editing.name || ''} onChange={e => updateField('name', e.target.value)} style={inputStyle} />
              </div>

              {/* Nationality + Birth + Death */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Nationality</label>
                  <input value={editing.nationality || ''} onChange={e => updateField('nationality', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Born</label>
                  <input type="number" value={editing.birth_year || ''} onChange={e => updateField('birth_year', Number(e.target.value) || null)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Died</label>
                  <input type="number" value={editing.death_year || ''} onChange={e => updateField('death_year', Number(e.target.value) || null)} style={inputStyle} />
                </div>
              </div>

              {/* Short bio */}
              <div>
                <label style={labelStyle}>Short bio <span style={{ fontWeight: 400, textTransform: 'none', fontSize: '11px', color: '#9A9590' }}>(shown in gallery detail)</span></label>
                <textarea value={editing.bio_short || ''} onChange={e => updateField('bio_short', e.target.value)}
                  rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }}
                  placeholder="A brief introduction to the artist…" />
              </div>

              {/* Long bio */}
              <div>
                <label style={labelStyle}>Full bio <span style={{ fontWeight: 400, textTransform: 'none', fontSize: '11px', color: '#9A9590' }}>(shown on artists page)</span></label>
                <textarea value={editing.bio_long || ''} onChange={e => updateField('bio_long', e.target.value)}
                  rows={6} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }}
                  placeholder="Full biography text…" />
              </div>

              {/* Website */}
              <div>
                <label style={labelStyle}>Website</label>
                <input value={editing.website || ''} onChange={e => updateField('website', e.target.value)}
                  placeholder="https://artist.com" style={inputStyle} />
              </div>

              {/* Instagram */}
              <div>
                <label style={labelStyle}>Instagram</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: '#9A9590' }}>@</span>
                  <input value={(editing.instagram || '').replace('@', '')}
                    onChange={e => updateField('instagram', e.target.value.replace('@', ''))}
                    placeholder="username" style={{ ...inputStyle, paddingLeft: '30px' }} />
                </div>
              </div>
            </div>

            {/* Save */}
            <div style={{ padding: '20px 28px', borderTop: '1px solid #E8E4DE', background: '#FAF9F6', position: 'sticky', bottom: 0 }}>
              <button onClick={saveArtist} disabled={saving} style={{
                width: '100%', padding: '15px', background: '#1C1A17', color: '#F4F2ED',
                border: 'none', cursor: saving ? 'wait' : 'pointer', fontSize: '15px', borderRadius: '4px',
                opacity: saving ? 0.7 : 1,
              }}>{saving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
