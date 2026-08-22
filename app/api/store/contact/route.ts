// app/api/store/contact/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/email'
import { SITE_NAME, CONTACT_EMAIL } from '@/lib/constants'

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json()

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: 'Name, email and message are required' },
        { status: 400 },
      )
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
      // BUG FIX: this used to always return the same "not configured"
      // message even when SMTP *was* configured but the send itself
      // failed (blocked/slow port, wrong password, DNS issue, etc.) —
      // which sent everyone chasing a .env problem that didn't exist.
      // Now it only claims "not configured" when that's actually true.
      const notConfigured = result.error === 'SMTP not configured'
      return NextResponse.json(
        {
          error: notConfigured
            ? 'Email is not configured on the server yet — set SMTP_USER/SMTP_PASS in .env.local'
            : `Could not send the email (${result.error ?? 'unknown error'})`,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Failed to send message' },
      { status: 500 },
    )
  }
}
