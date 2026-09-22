import { NextRequest, NextResponse } from 'next/server'
import { sendMail, notifyOwner } from '@/lib/email'
import { contactAutoReplyEmail, contactAdminEmail } from '@/lib/email-templates'
import { isRateLimited, getClientIp } from '@/lib/api/rate-limit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_ATTEMPTS_PER_IP = 5
const WINDOW_MS = 15 * 60 * 1000
const MAX_MESSAGE_LEN = 5000
const MAX_NAME_LEN = 200
const MAX_SUBJECT_LEN = 300

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    // This form was previously wide open: no email format check, no length
    // caps, and no rate limiting — meaning it could be scripted to send an
    // unlimited number of "new enquiry" emails to the store owner AND an
    // auto-reply to any arbitrary address, using this site's Resend account
    // as a free relay. That's the most likely source of the spam reports —
    // lock it down before anything else here.
    if (isRateLimited(`contact:${ip}`, MAX_ATTEMPTS_PER_IP, WINDOW_MS)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const { name, email, subject, message, website } = body

    // Honeypot: a real browser never fills this hidden field in; bots that
    // blindly fill every input on the form do. Silently accept so the bot
    // doesn't learn to skip the field, but never actually send mail.
    if (typeof website === 'string' && website.trim() !== '') {
      return NextResponse.json({ success: true }, { status: 200 })
    }

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email and message are required.' },
        { status: 400 },
      )
    }
    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: 'Enter a valid email address.' },
        { status: 400 },
      )
    }
    if (
      typeof name !== 'string' ||
      typeof message !== 'string' ||
      name.length > MAX_NAME_LEN ||
      message.length > MAX_MESSAGE_LEN ||
      (subject &&
        (typeof subject !== 'string' || subject.length > MAX_SUBJECT_LEN))
    ) {
      return NextResponse.json({ error: 'Invalid input.' }, { status: 400 })
    }

    // Notify the store owner of the new enquiry
    const adminEmail = contactAdminEmail({ name, email, subject, message })
    notifyOwner({
      subject: adminEmail.subject,
      html: adminEmail.html,
      text: adminEmail.text,
      resendTemplate: adminEmail.resendTemplate,
      customerEmail: email,
    }).catch((err) => {
      console.error('[contact] notifyOwner failed:', err)
    })

    // Send an auto-reply confirmation to the customer
    const autoReply = contactAutoReplyEmail({ name, message })
    sendMail({
      to: email,
      subject: autoReply.subject,
      html: autoReply.html,
      text: autoReply.text,
      resendTemplate: autoReply.resendTemplate,
    }).catch((err) => {
      console.error('[contact] auto-reply failed:', err)
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    console.error('[contact]', err)
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 },
    )
  }
}
