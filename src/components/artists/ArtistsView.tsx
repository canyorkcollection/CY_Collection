'use client'
import { useState } from 'react'
import Nav from '@/components/ui/Nav'

type ArtworkThumb = { url: string; title: string; id: string }
type Artist = {
  id: string; name: string; bio_short?: string; bio_long?: string
  nationality?: string; birth_year?: number; death_year?: number
  photo_url?: string; website?: string; instagram?: string; visible: boolean
  artworks?: ArtworkThumb[]
}

function thumbUrl(url: string, w: number) {
  return url?.startsWith('/api/image') ? `${url}&w=${w}` : url
}

export default function ArtistsView({ artists }: { artists: Artist[] }) {
  const [selected, setSelected] = useState<Artist | null>(artists[0] || null)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT — artist list */}
        <div style={{
          width: '320px', flexShrink: 0, borderRight: '1px solid var(--border)',
          overflowY: 'auto', padding: '32px 0',
        }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)', padding: '0 32px', marginBottom: '20px' }}>
            {artists.length} artists
          </p>
          {artists.map((artist) => {
            const active = selected?.id === artist.id
            return (
              <button key={artist.id} onClick={() => setSelected(artist)} style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '14px 32px', background: active ? 'var(--bg-warm)' : 'none',
                border: 'none', borderLeft: active ? '3px solid var(--text)' : '3px solid transparent',
                cursor: 'pointer', transition: 'background 0.15s',
              }}>
                <p style={{ fontSize: '17px', fontFamily: 'var(--font-display)', color: 'var(--text)', marginBottom: '2px' }}>
                  {artist.name}
                </p>
                {artist.nationality && (
                  <p style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
                    {artist.nationality}
                    {artist.birth_year && ` · b. ${artist.birth_year}`}
                    {artist.death_year && `–${artist.death_year}`}
                  </p>
                )}
              </button>
            )
          })}
        </div>

        {/* RIGHT — artist profile */}
        {selected ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '48px 60px' }}>
            <div style={{ maxWidth: '680px' }}>

              {/* Photo — small, secondary */}
              {selected.photo_url && (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', marginBottom: '24px', background: 'var(--bg-warm)' }}>
                  <img src={thumbUrl(selected.photo_url, 160)} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              <h1 style={{ fontSize: '36px', marginBottom: '6px' }}>{selected.name}</h1>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>
                {selected.nationality}
                {selected.birth_year && ` · b. ${selected.birth_year}`}
                {selected.death_year && `–${selected.death_year}`}
              </p>

              {/* Bio */}
              {(selected.bio_long || selected.bio_short) && (
                <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: '1.8', marginBottom: '36px', fontFamily: 'var(--font-display)' }}>
                  {selected.bio_long || selected.bio_short}
                </p>
              )}

              {/* Links */}
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '40px' }}>
                {selected.website && (
                  <a href={selected.website} target="_blank" rel="noopener noreferrer" style={{
                    fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none',
                    borderBottom: '1px solid var(--border-mid)', paddingBottom: '2px',
                  }}>Website ↗</a>
                )}
                {selected.instagram && (
                  <a href={`https://instagram.com/${selected.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{
                    fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none',
                    borderBottom: '1px solid var(--border-mid)', paddingBottom: '2px',
                  }}>Instagram ↗</a>
                )}
              </div>

              {/* Works */}
              {selected.artworks && selected.artworks.length > 0 && (
                <>
                  <p style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '16px' }}>
                    Works in collection — {selected.artworks.length}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {selected.artworks.map(aw => (
                      <div key={aw.id} style={{ width: '120px', cursor: 'pointer' }}
                        onClick={() => window.location.href = '/gallery'}>
                        <div style={{ width: '120px', height: '100px', background: 'var(--bg-warm)', overflow: 'hidden', marginBottom: '6px' }}>
                          <img src={thumbUrl(aw.url, 240)} alt={aw.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>{aw.title}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-faint)' }}>Select an artist</p>
          </div>
        )}
      </div>
    </div>
  )
}
