import { Resend } from 'resend'

let resend: Resend | null = null

function getClient(): Resend | null {
  if (resend) return resend
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  resend = new Resend(apiKey)
  return resend
}

// Sends a copy of a customer-facing transactional email to the store's
// admin inbox (MEDUSA_ADMIN_EMAIL), e.g. so Arjunn sees every shipping /
// refund confirmation that goes out. Silently no-ops if MEDUSA_ADMIN_EMAIL
// isn't set — never throws, so it's safe to call without awaiting.
export async function notifyAdmin(opts: {
  subject: string
  html: string
  text?: string
  customerEmail?: string
}): Promise<{
  sent: boolean
  error?: string
}> {
  const to = process.env.MEDUSA_ADMIN_EMAIL
  if (!to) {
    return {
      sent: false,
      error: 'MEDUSA_ADMIN_EMAIL not set',
    }
  }
  const prefix = opts.customerEmail ? `[Copy — ${opts.customerEmail}] ` : '[Copy] '
  return sendMail({
    to,
    subject: prefix + opts.subject,
    html: opts.html,
    text: opts.text,
  })
}

export async function sendMail(opts: {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}): Promise<{
  sent: boolean
  error?: string
}> {
  const client = getClient()
  if (!client) {
    console.warn(
      '[email] RESEND_API_KEY missing in .env.local — skipping send to',
      opts.to,
    )
    return {
      sent: false,
      error: 'Resend not configured',
    }
  }
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev'
  try {
    const { error } = await client.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    })
    if (error) {
      console.error('[email] send failed:', error.name ?? '', error.message)
      return {
        sent: false,
        error: error.message,
      }
    }
    return {
      sent: true,
    }
  } catch (err: any) {
    console.error('[email] send failed:', err.message)
    return {
      sent: false,
      error: err.message,
    }
  }
}