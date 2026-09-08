import { Resend } from 'resend'

let resend: Resend | null = null

function getClient(): Resend | null {
  if (resend) return resend
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  resend = new Resend(apiKey)
  return resend
}

// Sends an internal store-notification email to the store's admin inbox
// (MEDUSA_ADMIN_EMAIL). Callers pass a fully-formed, clean subject and a
// dedicated admin-facing template (see lib/email-templates.ts) — no
// "[Copy — email]" prefixing, so the inbox reads like a real notification
// system rather than a raw copy of the customer's email. Silently no-ops if
// MEDUSA_ADMIN_EMAIL isn't set — never throws, so it's safe to call without
// awaiting.
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
  return sendMail({
    to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  })
}

// Like notifyAdmin, but for the store owner's inbox rather than the Medusa
// admin inbox: prefers STORE_OWNER_EMAIL, falling back to MEDUSA_ADMIN_EMAIL
// if the owner address isn't set. Used for order/shipping/refund/new-customer
// notifications. Never throws — safe to call without awaiting.
export async function notifyOwner(opts: {
  subject: string
  html: string
  text?: string
  customerEmail?: string
}): Promise<{
  sent: boolean
  error?: string
}> {
  const to = process.env.STORE_OWNER_EMAIL || process.env.MEDUSA_ADMIN_EMAIL
  if (!to) {
    return {
      sent: false,
      error: 'STORE_OWNER_EMAIL not set',
    }
  }
  return sendMail({
    to,
    subject: opts.subject,
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
  attachments?: {
    filename: string
    path: string
  }[]
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
    const attachments = opts.attachments?.length
      ? await Promise.all(opts.attachments.map(resolveAttachment))
      : undefined
    const { error } = await client.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
      ...(attachments?.length ? { attachments } : {}),
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

// Resend's API fetches `path` attachments from its own cloud servers, so a
// URL pointing at localhost/127.0.0.1 (e.g. a local Medusa instance in dev,
// or any other machine Resend can't route to) will always fail with
// "Attachment path should not point to `localhost`". We can reach our own
// localhost fine from here (same machine, server-side), so for any
// non-publicly-routable host we fetch the file ourselves and hand Resend
// the raw bytes as base64 `content` instead of a `path` it has to fetch.
const LOCAL_HOSTNAME_RE =
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|.*\.local)$/i
const PRIVATE_IPV4_RE =
  /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/

function isLocallyRoutableOnly(rawUrl: string): boolean {
  try {
    const { hostname } = new URL(rawUrl)
    return LOCAL_HOSTNAME_RE.test(hostname) || PRIVATE_IPV4_RE.test(hostname)
  } catch {
    // Not a valid absolute URL — treat as local/relative so we resolve it
    // ourselves rather than handing an unfetchable path to Resend.
    return true
  }
}

async function resolveAttachment(attachment: {
  filename: string
  path: string
}): Promise<{ filename: string; path?: string; content?: string }> {
  if (!isLocallyRoutableOnly(attachment.path)) {
    // Publicly reachable URL (production) — let Resend fetch it directly,
    // same as before.
    return attachment
  }
  const res = await fetch(attachment.path)
  if (!res.ok) {
    throw new Error(
      `Could not fetch attachment "${attachment.filename}" from ${attachment.path} (${res.status})`,
    )
  }
  const buf = Buffer.from(await res.arrayBuffer())
  return {
    filename: attachment.filename,
    content: buf.toString('base64'),
  }
}
