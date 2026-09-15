import 'server-only'
import crypto from 'crypto'

// Signs an order id so the public, no-login tracking link (QR code / email)
// can't simply be guessed by incrementing/enumerating order ids — the link
// only works with the matching token. Reuses NEXTAUTH_SECRET (already
// relied on elsewhere as the app's server-side signing secret, see
// lib/api/google-shadow.ts) rather than introducing a new env var.
function secret(): string {
  const s = process.env.NEXTAUTH_SECRET
  if (!s) {
    throw new Error(
      'NEXTAUTH_SECRET is required to sign/verify public order-tracking links',
    )
  }
  return s
}

export function signOrderTrackToken(orderId: string): string {
  return crypto
    .createHmac('sha256', secret())
    .update(orderId)
    .digest('base64url')
    .slice(0, 22)
}

export function verifyOrderTrackToken(
  orderId: string,
  token: string | null | undefined,
): boolean {
  if (!token) return false
  const expected = signOrderTrackToken(orderId)
  const a = Buffer.from(expected)
  const b = Buffer.from(token)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
