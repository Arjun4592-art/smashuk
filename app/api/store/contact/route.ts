import { NextRequest, NextResponse } from 'next/server'
import { sendMail, notifyAdmin } from '@/lib/email'
import { SITE_NAME, CONTACT_EMAIL } from '@/lib/constants'
export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json()
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        {
          error: 'Name, email and message are required',
        },
        {
          status: 400,
        },
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
      replyTo: email,
    })
    if (!result.sent) {
      const notConfigured = result.error === 'Resend not configured'
      return NextResponse.json(
        {
          error: notConfigured
            ? 'Email is not configured on the server yet — set RESEND_API_KEY in .env.local'
            : `Could not send the email (${result.error ?? 'unknown error'})`,
        },
        {
          status: 500,
        },
      )
    }
    if (
      process.env.MEDUSA_ADMIN_EMAIL &&
      process.env.MEDUSA_ADMIN_EMAIL !== CONTACT_EMAIL
    ) {
      notifyAdmin({
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
        customerEmail: email,
      }).catch(() => {})
    }
    sendMail({
      to: email,
      subject: `We've received your message — ${SITE_NAME}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#E8553A;">Thanks for reaching out, ${name}!</h2>
          <p>We've received your message and someone from the ${SITE_NAME} team will get back to you shortly.</p>
          <p style="color:#8C9196; font-size:12px; margin-top:24px;">Your message: "${String(message).slice(0, 200)}${message.length > 200 ? '…' : ''}"</p>
        </div>
      `,
      text: `Thanks for reaching out, ${name}! We've received your message and someone from the ${SITE_NAME} team will get back to you shortly.`,
    }).catch(() => {})
    return NextResponse.json({
      success: true,
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message ?? 'Failed to send message',
      },
      {
        status: 500,
      },
    )
  }
}
