'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) router.push('/admin')
      else { const d = await res.json(); setError(d.error || 'Incorrect credentials.') }
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
            <label style={{ fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B6760', display: 'block', marginBottom: '6px' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoFocus placeholder="admin@canyork.com" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B6760', display: 'block', marginBottom: '6px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••" style={{ ...inputStyle, paddingRight: '48px' }} />
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
          }}>{loading ? 'Signing in…' : 'Sign in'}</button>

          <a href="/admin/forgot-password" style={{
            fontSize: '13px', color: '#6B6760', textAlign: 'center',
            textDecoration: 'none', borderBottom: '1px solid #D4CFC9',
            alignSelf: 'center', paddingBottom: '1px',
          }}>Forgot password?</a>
        </div>
      </div>
    </div>
  )
}
