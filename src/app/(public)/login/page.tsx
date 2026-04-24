'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Nav from '@/components/ui/Nav'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [code, setCode] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) setCode(token)
  }, [searchParams])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })

    if (res.ok) {
      router.push('/gallery')
    } else {
      const data = await res.json()
      setError(data.error || 'Invalid code')
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '340px' }}>
      <p className="label" style={{ marginBottom: '24px' }}>
        Can York — Private Collection
      </p>
      <h1 style={{
        fontSize: '22px',
        fontWeight: 400,
        marginBottom: '8px',
        letterSpacing: '0.02em',
      }}>
        Enter your invitation
      </h1>
      <p style={{
        fontSize: '13px',
        color: 'var(--text-muted)',
        marginBottom: '32px',
        lineHeight: '1.6',
      }}>
        Access is by invitation only. Enter the code or password provided.
      </p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="Invitation code or password"
          style={{
            width: '100%',
            border: 'none',
            borderBottom: '1px solid var(--border-mid)',
            background: 'transparent',
            padding: '10px 0',
            fontSize: '14px',
            outline: 'none',
            marginBottom: '8px',
            fontFamily: 'inherit',
            color: 'var(--text)',
          }}
        />
        {error && (
          <p style={{ fontSize: '12px', color: '#c00', marginBottom: '16px' }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !code}
          style={{
            width: '100%',
            background: 'var(--text)',
            color: 'var(--bg)',
            border: 'none',
            padding: '13px',
            fontSize: '11px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            cursor: loading ? 'wait' : 'pointer',
            marginTop: '16px',
            fontFamily: 'inherit',
            opacity: !code ? 0.5 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {loading ? 'Checking...' : 'Access collection'}
        </button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Nav />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 61px)',
        padding: '40px',
      }}>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
