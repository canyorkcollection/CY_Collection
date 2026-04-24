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
  const [copied, setCopied] = useState<string | null>(null)

  function generateCode(): string {
    const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join('')
    return `CY-${hex}`
  }

  async function createInvitation() {
    if (!newLabel.trim() && !newEmail.trim()) return
    setCreating(true)
    const token = generateCode()
    const res = await fetch('/api/admin/invitations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail.trim() || null, label: newLabel.trim() || null, token, active: true }),
    })
    if (res.ok) {
      const inv = await res.json()
      setInvitations(prev => [inv, ...prev])
      setNewEmail(''); setNewLabel(''); setShowCreate(false)
    }
    setCreating(false)
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

  function copyCode(token: string) {
    navigator.clipboard.writeText(token)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  function copyLink(token: string) {
    const baseUrl = window.location.origin
    navigator.clipboard.writeText(`${baseUrl}/login?token=${token}`)
    setCopied(`link-${token}`)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div style={{ padding: '40px 48px', maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: '#1C1A17', fontWeight: 400, marginBottom: '4px' }}>Invitations</h1>
          <p style={{ fontSize: '14px', color: '#6B6760' }}>Create access codes to share via WhatsApp or email.</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} style={{
          padding: '12px 24px', background: '#1C1A17', color: '#F4F2ED',
          border: 'none', cursor: 'pointer', fontSize: '14px', borderRadius: '6px',
        }}>+ New code</button>
      </div>

      {/* How it works */}
      <div style={{ background: '#EDE9E2', border: '1px solid #D4CFC9', borderRadius: '8px', padding: '16px 20px', marginBottom: '28px' }}>
        <p style={{ fontSize: '13px', color: '#5C5850', lineHeight: '1.7' }}>
          <strong>How it works:</strong> Create a code and share it via WhatsApp. Visitors enter the code on the login page to access the gallery. You can revoke access at any time.
        </p>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: '#FAF9F6', border: '1px solid #D4CFC9', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontFamily: 'Georgia, serif', fontWeight: 400, marginBottom: '20px', color: '#1C1A17' }}>New access code</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Name or note</label>
              <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createInvitation()}
                autoFocus placeholder="e.g. María García — Barcelona" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email (optional)</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                placeholder="collector@example.com" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={createInvitation} disabled={creating} style={{
                padding: '12px 24px', background: '#1C1A17', color: '#F4F2ED',
                border: 'none', cursor: creating ? 'wait' : 'pointer', fontSize: '14px', borderRadius: '4px',
              }}>{creating ? 'Creating...' : 'Create code'}</button>
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
          <p style={{ fontSize: '15px' }}>No access codes yet.</p>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>Create one to invite a visitor.</p>
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
                  {inv.label && (
                    <p style={{ fontSize: '15px', color: '#1C1A17', marginBottom: '2px', fontWeight: 500 }}>{inv.label}</p>
                  )}
                  {inv.email && (
                    <p style={{ fontSize: '13px', color: '#6B6760', marginBottom: '4px' }}>{inv.email}</p>
                  )}
                  <p style={{ fontSize: '16px', fontFamily: 'monospace', color: '#1C1A17', background: '#EDE9E2', display: 'inline-block', padding: '4px 12px', borderRadius: '4px', letterSpacing: '0.05em' }}>
                    {inv.token}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{
                      fontSize: '12px', padding: '3px 10px', borderRadius: '20px',
                      background: inv.active ? '#E8F5EE' : '#F5F0EE',
                      color: inv.active ? '#2A6E47' : '#9A9590',
                    }}>{inv.active ? 'Active' : 'Revoked'}</span>
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
                  <button onClick={() => copyCode(inv.token)} style={{
                    padding: '8px 14px', background: copied === inv.token ? '#E8F5EE' : '#F0EDE8',
                    border: '1px solid #D4CFC9', cursor: 'pointer', fontSize: '13px',
                    color: copied === inv.token ? '#2A6E47' : '#1C1A17', borderRadius: '4px',
                  }}>{copied === inv.token ? '✓ Copied' : 'Copy code'}</button>
                  <button onClick={() => copyLink(inv.token)} style={{
                    padding: '8px 14px', background: copied === `link-${inv.token}` ? '#E8F5EE' : '#F0EDE8',
                    border: '1px solid #D4CFC9', cursor: 'pointer', fontSize: '13px',
                    color: copied === `link-${inv.token}` ? '#2A6E47' : '#6B6760', borderRadius: '4px',
                  }}>{copied === `link-${inv.token}` ? '✓ Copied' : 'Copy link'}</button>
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
