import { supabaseAdmin } from '@/lib/supabase'

export default async function AdminPage() {
  const [
    { count: artworkCount },
    { count: artistCount },
    { count: invitationCount },
    { data: recentInvitations },
  ] = await Promise.all([
    supabaseAdmin.from('artworks').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('artists').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('invitations').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('invitations').select('*').order('created_at', { ascending: false }).limit(5),
  ])

  const stats = [
    { label: 'Artworks', value: artworkCount || 0, href: '/admin/artworks', emoji: '🖼' },
    { label: 'Artists', value: artistCount || 0, href: '/admin/artists', emoji: '👤' },
    { label: 'Invitations', value: invitationCount || 0, href: '/admin/invitations', emoji: '✉️' },
  ]

  return (
    <div style={{ padding: '48px 56px', maxWidth: '900px' }}>
      <h1 style={{ fontSize: '32px', fontFamily: 'Georgia, serif', color: '#1C1A17', marginBottom: '8px', fontWeight: 400 }}>
        Good day 👋
      </h1>
      <p style={{ fontSize: '15px', color: '#6B6760', marginBottom: '48px' }}>
        Here's what's in the collection.
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '56px' }}>
        {stats.map(({ label, value, href, emoji }) => (
          <a key={label} href={href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#FAF9F6', border: '1px solid #D4CFC9',
              padding: '28px 32px', borderRadius: '8px',
              transition: 'box-shadow 0.2s',
            }}>
              <p style={{ fontSize: '28px', marginBottom: '4px' }}>{emoji}</p>
              <p style={{ fontSize: '36px', color: '#1C1A17', fontFamily: 'Georgia, serif', fontWeight: 400, marginBottom: '4px' }}>{value}</p>
              <p style={{ fontSize: '13px', color: '#9A9590', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: '48px' }}>
        <p style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9590', marginBottom: '16px' }}>Quick actions</p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { href: '/admin/artworks', label: 'Manage artworks' },
            { href: '/admin/artists', label: 'Manage artists' },
            { href: '/admin/invitations', label: 'Send invitation' },
            { href: '/admin/contact', label: 'Edit contact info' },
          ].map(({ href, label }) => (
            <a key={href} href={href} style={{
              padding: '12px 20px', background: '#FAF9F6', border: '1px solid #D4CFC9',
              fontSize: '14px', color: '#1C1A17', textDecoration: 'none',
              borderRadius: '6px', transition: 'background 0.15s',
            }}>{label}</a>
          ))}
        </div>
      </div>

      {/* Recent invitations */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9590' }}>Recent invitations</p>
          <a href="/admin/invitations" style={{ fontSize: '13px', color: '#6B6760', textDecoration: 'none' }}>See all →</a>
        </div>
        <div style={{ background: '#FAF9F6', border: '1px solid #D4CFC9', borderRadius: '8px', overflow: 'hidden' }}>
          {recentInvitations?.length ? recentInvitations.map((inv: any, i: number) => (
            <div key={inv.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px',
              borderBottom: i < recentInvitations.length - 1 ? '1px solid #E8E4DE' : 'none',
            }}>
              <div>
                <p style={{ fontSize: '14px', color: '#1C1A17', marginBottom: '2px' }}>{inv.label || inv.email || inv.token}</p>
                <p style={{ fontSize: '12px', color: '#9A9590' }}>
                  {new Date(inv.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <span style={{
                fontSize: '12px', padding: '4px 10px', borderRadius: '20px',
                background: inv.active ? '#E8F5EE' : '#F5F0EE',
                color: inv.active ? '#2A6E47' : '#9A9590',
              }}>{inv.active ? 'Active' : 'Revoked'}</span>
            </div>
          )) : (
            <div style={{ padding: '32px', textAlign: 'center', color: '#9A9590', fontSize: '14px' }}>
              No invitations yet. <a href="/admin/invitations" style={{ color: '#1C1A17' }}>Create one →</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
