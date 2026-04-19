import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function isAdmin(req: NextRequest) { return !!req.cookies.get('cy_admin') }

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invitationId } = await request.json()
  const { data: inv } = await supabaseAdmin.from('invitations').select('*').eq('id', invitationId).single()
  if (!inv) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  if (!inv.email) return NextResponse.json({ error: 'No email on this invitation' }, { status: 400 })

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const loginUrl = `${baseUrl}/login?token=${inv.token}`

  // TODO: Replace with real email service (Resend recommended)
  // npm install resend
  // import { Resend } from 'resend'
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: 'Can York <noreply@canyork.com>',
  //   to: inv.email,
  //   subject: 'You have been invited to Can York Private Collection',
  //   html: `
  //     <p>You have been granted access to the Can York private collection.</p>
  //     <p><a href="${loginUrl}">Click here to access the gallery</a></p>
  //     <p>Or copy this link: ${loginUrl}</p>
  //   `,
  // })

  // For now: log to console and return success
  console.log(`[Invitation] Send email to ${inv.email}`)
  console.log(`[Invitation] Login URL: ${loginUrl}`)

  // Update sent_at
  await supabaseAdmin.from('invitations').update({ used_at: new Date().toISOString() }).eq('id', invitationId)

  return NextResponse.json({ ok: true, loginUrl })
}
