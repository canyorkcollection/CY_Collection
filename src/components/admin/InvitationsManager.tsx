'use client'
import { useState } from 'react'

type Invitation = {
  id: string; email?: string; label?: string; token: string
  active: boolean; used_at?: string; created_at: string
  setup_completed?: boolean; password_hash?: string
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid #D4CFC9',
  background: '#FAF9F6', fontSize: '14px', color: '#1C1A17', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase',
  color: '#6B6760', display: 'block', marginBottom: '6px',
}

export default function InvitationsManager({ initialInvitations }: { initialInvitations: Invitation[] }) {
  const [invitations, setInvitations] = useState(initialInvitations)
  const [showCreate, setShowCreate] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)

  async function createInvitation() {
    if (!newEmail.trim()) return
    setCreating(true)
    const token = Math.random().toString(36).slice(2, 10)
    const res = await fetch('/api/admin/invitations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail.trim(), label: newLabel || null, token, active: true }),
    })
    if (res.ok) {
      const inv = await res.json()
      setInvitations(prev => [inv, ...prev])
      setNewEmail(''); setNewLabel(''); setShowCreate(false)
    }
    setCreating(false)
  }

  async function sendInvitationEmail(inv: Invitation) {
    setSending(inv.id)
    const res = await fetch('/api/admin/invitations/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationId: inv.id }),
    })
    if (res.ok) { setSent(inv.id); setTimeout(() => setSent(null), 3000) }
    else alert('Could not send email. Check email configuration.')
    setSending(null)
  }

  async function toggleInvitation(id: string, active: boolean) {
    const res = await fetch(`/api/admin/invitations/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    if (res.ok) setInvitations(prev => prev.map(i => i.id === id ? { ...i, active: !active } : i))
  }

  async function deleteInvitation(id: string) {
    if (!confirm('Delete this invitation?')) return
    const res = await fetch(`/api/admin/invitations/${id}`, { method: 'DELETE' })
    if (res.ok) setInvitations(prev => prev.filter(i => i.id !== id))
  }

  const loginUrl = (token: string) =>
    typeof window !== 'undefined' ? `${window.location.origin}/login?token=${token}` : `/login?token=${token}`

  return (
    <div style={{ padding: '40px 48px', maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: '#1C1A17', fontWeight: 400, marginBottom: '4px' }}>Invitations</h1>
          <p style={{ fontSize: '14px', color: '#6B6760' }}>Invite collectors to access the private gallery.</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} style={{
          padding: '12px 24px', background: '#1C1A17', color: '#F4F2ED',
          border: 'none', cursor: 'pointer', fontSize: '14px', borderRadius: '6px',
        }}>+ Invite someone</button>
      </div>

      {/* How it works */}
      <div style={{ background: '#EDE9E2', border: '1px solid #D4CFC9', borderRadius: '8px', padding: '16px 20px', marginBottom: '28px' }}>
        <p style={{ fontSize: '13px', color: '#5C5850', lineHeight: '1.7' }}>
          <strong>How it works:</strong> Enter the collector's email and click "Send invitation". They will receive an email with a private link to set up their password and access the gallery. You can revoke access at any time.
        </p>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: '#FAF9F6', border: '1px solid #D4CFC9', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontFamily: 'Georgia, serif', fontWeight: 400, marginBottom: '20px', color: '#1C1A17' }}>New invitation</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Collector's email *</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createInvitation()}
                autoFocus placeholder="collector@example.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Name or note (optional)</label>
              <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                placeholder="e.g. María García — Barcelona" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={createInvitation} disabled={creating} style={{
                padding: '12px 24px', background: '#1C1A17', color: '#F4F2ED',
                border: 'none', cursor: creating ? 'wait' : 'pointer', fontSize: '14px', borderRadius: '4px',
              }}>{creating ? 'Creating…' : 'Create invitation'}</button>
              <button onClick={() => setShowCreate(false)} style={{
                padding: '12px 16px', background: 'none', border: '1px solid #D4CFC9',
                cursor: 'pointer', fontSize: '14px', color: '#6B6760', borderRadius: '4px',
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {invitations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#9A9590' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>✉️</p>
          <p style={{ fontSize: '15px' }}>No invitations yet.</p>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>Create one to invite a collector.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {invitations.map(inv => (
            <div key={inv.id} style={{
              background: '#FAF9F6', border: '1px solid #D4CFC9', borderRadius: '8px', padding: '20px 24px',
              opacity: inv.active ? 1 : 0.6,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {inv.email && (
                    <p style={{ fontSize: '15px', color: '#1C1A17', marginBottom: '2px', fontWeight: 500 }}>{inv.email}</p>
                  )}
                  {inv.label && (
                    <p style={{ fontSize: '13px', color: '#6B6760', marginBottom: '6px' }}>{inv.label}</p>
                  )}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '12px', padding: '3px 10px', borderRadius: '20px',
                      background: inv.active ? '#E8F5EE' : '#F5F0EE',
                      color: inv.active ? '#2A6E47' : '#9A9590',
                    }}>{inv.active ? 'Active' : 'Revoked'}</span>
                    {inv.setup_completed && (
                      <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: '#EEF0F8', color: '#4A5898' }}>
                        Password set ✓
                      </span>
                    )}
                    {inv.used_at && (
                      <span style={{ fontSize: '12px', color: '#9A9590' }}>
                        Last access: {new Date(inv.used_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    <span style={{ fontSize: '12px', color: '#C2BDB7' }}>
                      Created {new Date(inv.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {inv.email && inv.active && (
                    <button onClick={() => sendInvitationEmail(inv)} disabled={sending === inv.id} style={{
                      padding: '8px 14px', background: sent === inv.id ? '#E8F5EE' : '#F0EDE8',
                      border: '1px solid #D4CFC9', cursor: sending === inv.id ? 'wait' : 'pointer',
                      fontSize: '13px', color: sent === inv.id ? '#2A6E47' : '#1C1A17', borderRadius: '4px',
                    }}>
                      {sending === inv.id ? 'Sending…' : sent === inv.id ? '✓ Sent' : '📧 Send email'}
                    </button>
                  )}
                  <button onClick={() => { navigator.clipboard.writeText(loginUrl(inv.token)) }} style={{
                    padding: '8px 14px', background: '#F0EDE8', border: '1px solid #D4CFC9',
                    cursor: 'pointer', fontSize: '13px', color: '#1C1A17', borderRadius: '4px',
                  }}>Copy link</button>
                  <button onClick={() => toggleInvitation(inv.id, inv.active)} style={{
                    padding: '8px 14px', background: 'none', border: '1px solid #D4CFC9',
                    cursor: 'pointer', fontSize: '13px', color: inv.active ? '#B03020' : '#2A6E47', borderRadius: '4px',
                  }}>{inv.active ? 'Revoke' : 'Enable'}</button>
                  <button onClick={() => deleteInvitation(inv.id)} style={{
                    padding: '8px 10px', background: 'none', border: '1px solid #E8C8C4',
                    cursor: 'pointer', fontSize: '13px', color: '#B03020', borderRadius: '4px',
                  }}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
