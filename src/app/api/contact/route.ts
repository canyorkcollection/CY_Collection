import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, message } = body

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Log to console for now (replace with email service like Resend/Nodemailer later)
    console.log('[Contact Form]', { name, email, subject, message, timestamp: new Date().toISOString() })

    // TODO: Add email sending via Resend or similar
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({
    //   from: 'noreply@canyork.com',
    //   to: 'info@canyork.com',
    //   subject: `Contact: ${subject || 'New inquiry'} from ${name}`,
    //   text: `From: ${name} <${email}>\n\n${message}`,
    // })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Contact Form Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
