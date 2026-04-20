#!/bin/bash
# ============================================================
# CAN YORK — Fix Nav: hide menu on public pages, fix logout redirect
# Run from your CAN-YORK project root:
#   bash fix-nav.sh
# ============================================================

set -e

# --- 1. Update Nav component ---
cat > src/components/ui/Nav.tsx << 'NAVFILE'
'use client'
import { usePathname } from 'next/navigation'

const LINKS = [
  ['Gallery', '/gallery'],
  ['Artists', '/artists'],
  ['Contact', '/contact'],
]

// Public pages: home, login — only show brand, no nav links, no Exit
const PUBLIC_PATHS = ['/', '/home', '/login']

export default function Nav() {
  const pathname = usePathname()
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith('/login'))

  return (
    <nav style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '22px 48px', borderBottom: '1px solid var(--border)',
      background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10,
    }}>
      <a href={isPublic ? '/login' : '/gallery'} style={{
        fontFamily: 'var(--font-display)', fontSize: '20px',
        letterSpacing: '0.06em', textDecoration: 'none', color: 'var(--text)',
      }}>
        Can York
      </a>

      {/* Hide nav links + Exit on public pages */}
      {!isPublic && (
        <>
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
        </>
      )}

      {/* Spacer to keep brand left-aligned on public pages */}
      {isPublic && <div style={{ width: '60px' }} />}
    </nav>
  )
}
NAVFILE

# --- 2. Fix logout redirect ---
cat > src/app/api/auth/logout/route.ts << 'LOGOUTFILE'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.get('host')}` || 'http://localhost:3000'
  const res = NextResponse.redirect(new URL('/login', baseUrl))
  res.cookies.delete('cy_session')
  return res
}
LOGOUTFILE

echo "✅ Nav and logout fixed!"
echo ""
echo "Changes:"
echo "  - Nav: hides Gallery/Artists/Contact/Exit on public pages (home, login)"
echo "  - Nav: shows full navigation on private pages (gallery, artists, contact)"
echo "  - Logo: links to /login on public pages, /gallery on private pages"
echo "  - Logout: redirects to /login using request host (not localhost)"
echo ""
echo "Now run: git add . && git commit -m 'fix: hide nav on public pages, fix logout redirect' && git push"
