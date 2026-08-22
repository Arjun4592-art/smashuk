// lib/email.ts — SERVER ONLY.
//
// This project had NO email-sending capability at all before this — staff
// invites were only ever created silently in Medusa, no email was ever
// sent to anyone. This adds a minimal SMTP sender (works with Gmail,
// Outlook, or any SMTP provider) that other features can reuse.
//
// Required in .env.local:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
// For Gmail: use an "App Password" (Google Account → Security → 2-Step
// Verification → App Passwords) — a normal Gmail password will NOT work.

import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT ?? 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    return null
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    // BUG FIX: nodemailer has no timeout by default, so if the SMTP port
    // is slow, throttled, or silently blocked (common on some ISPs/office
    // networks for outbound port 587/465), sendMail() used to hang for
    // 1-2 minutes before failing — during which the customer just saw a
    // spinner, then a generic "please try again" error. These timeouts
    // make it fail fast (~15s) with a clear reason instead.
    connectionTimeout: 15_000, // time to establish the TCP connection
    greetingTimeout: 15_000, // time to wait for the server's initial greeting
    socketTimeout: 20_000, // time to wait on an idle socket during the send
  })
  return transporter
}

export async function sendMail(opts: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<{ sent: boolean; error?: string }> {
  const t = getTransporter()
  if (!t) {
    console.warn(
      '[email] SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing in .env.local) — skipping send to',
      opts.to,
    )
    return { sent: false, error: 'SMTP not configured' }
  }

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    })
    return { sent: true }
  } catch (err: any) {
    // BUG FIX: log the specific nodemailer error code too (ETIMEDOUT,
    // EAUTH, ECONNREFUSED, etc.) — "Connection timeout" alone doesn't say
    // whether it's a blocked port, wrong host, or bad credentials, which
    // made this very hard to diagnose from the logs alone.
    console.error('[email] send failed:', err.code ?? '', err.message)
    return { sent: false, error: err.message }
  }
}
