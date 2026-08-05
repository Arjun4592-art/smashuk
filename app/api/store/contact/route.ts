// app/api/store/contact/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/email'
import { SITE_NAME, CONTACT_EMAIL } from '@/lib/constants'

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json()

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Name, email and message are required' }, { status: 400 })
    }

    const result = await sendMail({
      to: CONTACT_EMAIL,
      subject: `[${SITE_NAME} Contact] ${subject || 'New enquiry'} — from ${name}`,
      html: `
        <div style="font-family: sans-serif;">
          <p><strong>From:</strong> ${name} (${email})</p>
          <p><strong>Subject:</strong> ${subject || '(none)'}</p>
          <p><strong>Message:</strong></p>
          <p>${String(message).replace(/\n/g, '<br/>')}</p>
        </div>
      `,
      text: `From: ${name} (${email})\nSubject: ${subject || '(none)'}\n\n${message}`,
    })

    if (!result.sent) {
      return NextResponse.json(
        { error: 'Email is not configured on the server yet — set SMTP_USER/SMTP_PASS in .env.local' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to send message' }, { status: 500 })
  }
}
