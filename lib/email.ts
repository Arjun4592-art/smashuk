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
    console.error('[email] send failed:', err.message)
    return { sent: false, error: err.message }
  }
}
