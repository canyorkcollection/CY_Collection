'use client'
import { useState } from 'react'
import Nav from '@/components/ui/Nav'

type ContactInfo = {
  email?: string; phone?: string; address?: string
  city?: string; hours?: string; description?: string
}

export default function ContactView({ info }: { info: ContactInfo }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  function update(field: string, val: string) {
    setForm(f => ({ ...f, [field]: val }))
  }

  async function handleSubmit() {
    if (!form.name || !form.email || !form.message) return
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) { setStatus('sent'); setForm({ name: '', email: '', subject: '', message: '' }) }
      else setStatus('error')
    } catch { setStatus('error') }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 0', background: 'none', border: 'none',
    borderBottom: '1px solid var(--border-mid)', outline: 'none',
    fontSize: '15px', color: 'var(--text)', lineHeight: '1.5',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'var(--text-muted)', display: 'block', marginBottom: '6px',
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <div style={{ flex: 1, maxWidth: '960px', margin: '0 auto', width: '100%', padding: '64px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'start' }}>

          {/* Left: info */}
          <div>
            <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>Contact</h1>
            {info.description && (
              <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: '1.8', marginBottom: '40px', fontFamily: 'var(--font-display)' }}>
                {info.description}
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {[
                { label: 'Email', value: info.email, href: info.email ? `mailto:${info.email}` : undefined },
                { label: 'Phone', value: info.phone, href: info.phone ? `tel:${info.phone}` : undefined },
                { label: 'Address', value: info.address },
                { label: 'City', value: info.city },
                { label: 'Hours', value: info.hours },
              ].filter(f => f.value).map(({ label, value, href }) => (
                <div key={label}>
                  <span style={labelStyle}>{label}</span>
                  {href ? (
                    <a href={href} style={{ fontSize: '16px', color: 'var(--text)', textDecoration: 'none', borderBottom: '1px solid var(--border)' }}>{value}</a>
                  ) : (
                    <span style={{ fontSize: '16px', color: 'var(--text)' }}>{value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: form */}
          <div>
            {status === 'sent' ? (
              <div style={{ paddingTop: '20px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>Message sent.</h2>
                <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '24px' }}>
                  Thank you for reaching out. We will be in touch shortly.
                </p>
                <button onClick={() => setStatus('idle')} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '14px', color: 'var(--text-muted)', padding: 0,
                  borderBottom: '1px solid var(--border)',
                }}>Send another message</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {[
                  { field: 'name', label: 'Your name *', type: 'text' },
                  { field: 'email', label: 'Email address *', type: 'email' },
                  { field: 'subject', label: 'Subject', type: 'text' },
                ].map(({ field, label, type }) => (
                  <div key={field}>
                    <label style={labelStyle}>{label}</label>
                    <input type={type} value={form[field as keyof typeof form]}
                      onChange={e => update(field, e.target.value)} style={inputStyle} />
                  </div>
                ))}
                <div>
                  <label style={labelStyle}>Message *</label>
                  <textarea value={form.message} onChange={e => update('message', e.target.value)}
                    rows={5} style={{ ...inputStyle, resize: 'none', lineHeight: '1.65' }} />
                </div>
                {status === 'error' && (
                  <p style={{ fontSize: '14px', color: 'var(--admin-red)' }}>Something went wrong. Please try again.</p>
                )}
                <button onClick={handleSubmit} disabled={status === 'sending'} style={{
                  padding: '14px 32px', background: 'var(--text)', color: 'var(--bg)',
                  border: 'none', cursor: status === 'sending' ? 'wait' : 'pointer',
                  fontSize: '14px', letterSpacing: '0.06em', alignSelf: 'flex-start',
                  opacity: status === 'sending' ? 0.7 : 1, transition: 'opacity 0.2s',
                }}>
                  {status === 'sending' ? 'Sending…' : 'Send message'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
