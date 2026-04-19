'use client'
import { useState } from 'react'

type ContactInfo = { id?: number; email?: string; phone?: string; address?: string; city?: string; hours?: string; description?: string }

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid #D4CFC9',
  background: '#FAF9F6', fontSize: '14px', color: '#1C1A17', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase',
  color: '#6B6760', display: 'block', marginBottom: '6px',
}

export default function ContactInfoManager({ initialInfo }: { initialInfo: ContactInfo }) {
  const [info, setInfo] = useState(initialInfo)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function update(key: string, val: string) { setInfo(i => ({ ...i, [key]: val })); setSaved(false) }

  async function save() {
    setSaving(true)
    const res = await fetch('/api/admin/contact', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(info),
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  return (
    <div style={{ padding: '40px 48px', maxWidth: '600px' }}>
      <h1 style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: '#1C1A17', fontWeight: 400, marginBottom: '8px' }}>Contact info</h1>
      <p style={{ fontSize: '14px', color: '#6B6760', marginBottom: '36px' }}>
        This information appears on the Contact page of the gallery.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={labelStyle}>Description</label>
          <textarea value={info.description || ''} onChange={e => update('description', e.target.value)}
            rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }}
            placeholder="For inquiries about artworks, acquisitions, and private viewings." />
        </div>
        {[
          { key: 'email', label: 'Email', placeholder: 'info@canyork.com', type: 'email' },
          { key: 'phone', label: 'Phone', placeholder: '+34 000 000 000', type: 'tel' },
          { key: 'address', label: 'Address', placeholder: 'Carrer de…', type: 'text' },
          { key: 'city', label: 'City', placeholder: 'Ibiza, España', type: 'text' },
          { key: 'hours', label: 'Hours', placeholder: 'By appointment', type: 'text' },
        ].map(({ key, label, placeholder, type }) => (
          <div key={key}>
            <label style={labelStyle}>{label}</label>
            <input type={type} value={(info as any)[key] || ''} onChange={e => update(key, e.target.value)}
              placeholder={placeholder} style={inputStyle} />
          </div>
        ))}

        <button onClick={save} disabled={saving} style={{
          padding: '15px 32px', background: '#1C1A17', color: '#F4F2ED',
          border: 'none', cursor: saving ? 'wait' : 'pointer', fontSize: '15px',
          borderRadius: '4px', alignSelf: 'flex-start',
          opacity: saving ? 0.7 : 1,
        }}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
