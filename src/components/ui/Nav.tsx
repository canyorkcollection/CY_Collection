'use client'
import { usePathname } from 'next/navigation'

const LINKS = [
  ['Gallery', '/gallery'],
  ['Artists', '/artists'],
  ['Contact', '/contact'],
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '22px 48px', borderBottom: '1px solid var(--border)',
      background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10,
    }}>
      <a href="/gallery" style={{
        fontFamily: 'var(--font-display)', fontSize: '20px',
        letterSpacing: '0.06em', textDecoration: 'none', color: 'var(--text)',
      }}>
        Can York
      </a>
      <div style={{ display: 'flex', gap: '36px' }}>
        {LINKS.map(([label, href]) => {
          const active = pathname === href
          return (
            <a key={href} href={href} style={{
              fontSize: '13px', letterSpacing: '0.08em',
              color: active ? 'var(--text)' : 'var(--text-muted)',
              textDecoration: 'none',
              borderBottom: active ? '1px solid var(--text)' : '1px solid transparent',
              paddingBottom: '2px',
              transition: 'color 0.15s',
            }}>{label}</a>
          )
        })}
      </div>
      <a href="/api/auth/logout" style={{
        fontSize: '13px', letterSpacing: '0.06em',
        color: 'var(--text-muted)', textDecoration: 'none',
      }}>Exit</a>
    </nav>
  )
}
