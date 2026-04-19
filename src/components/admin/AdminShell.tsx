'use client'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const NAV = [
  { href: '/admin', label: 'Overview', emoji: '📊' },
  { href: '/admin/artworks', label: 'Artworks', emoji: '🖼' },
  { href: '/admin/artists', label: 'Artists', emoji: '👤' },
  { href: '/admin/invitations', label: 'Invitations', emoji: '✉️' },
  { href: '/admin/contact', label: 'Contact info', emoji: '📍' },
]

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/admin/login' || pathname === '/admin/forgot-password'
  if (isLogin) return <>{children}</>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F0EDE8', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px', flexShrink: 0, background: '#E8E4DE',
        borderRight: '1px solid #D4CFC9',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid #D4CFC9' }}>
          <p style={{ fontSize: '18px', fontFamily: 'Georgia, serif', color: '#1C1A17', marginBottom: '2px' }}>Can York</p>
          <p style={{ fontSize: '12px', color: '#9A9590', letterSpacing: '0.06em' }}>Admin panel</p>
        </div>

        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {NAV.map(({ href, label, emoji }) => {
            const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
            return (
              <a key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 14px', marginBottom: '4px',
                fontSize: '14px', color: active ? '#1C1A17' : '#6B6760',
                textDecoration: 'none',
                background: active ? '#F0EDE8' : 'none',
                borderRadius: '6px',
                fontWeight: active ? 500 : 400,
                transition: 'background 0.15s, color 0.15s',
              }}>
                <span style={{ fontSize: '16px' }}>{emoji}</span>
                {label}
              </a>
            )
          })}
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid #D4CFC9' }}>
          <a href="/gallery" target="_blank" style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 14px', fontSize: '13px', color: '#9A9590',
            textDecoration: 'none', marginBottom: '4px',
          }}>
            <span>🔗</span> View gallery
          </a>
          <button onClick={async () => {
            await fetch('/api/admin/logout', { method: 'POST' })
            window.location.href = '/admin/login'
          }} style={{
            display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
            padding: '10px 14px', fontSize: '13px', color: '#9A9590',
            background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          }}>
            <span>🚪</span> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', background: '#F4F2ED' }}>
        {children}
      </main>
    </div>
  )
}
