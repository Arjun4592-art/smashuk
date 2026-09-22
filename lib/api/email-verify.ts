import { promises as dns } from 'dns'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.info',
  'guerrillamail.biz',
  'guerrillamail.de',
  'sharklasers.com',
  '10minutemail.com',
  '10minutemail.net',
  'tempmail.com',
  'temp-mail.org',
  'trashmail.com',
  'yopmail.com',
  'fakeinbox.com',
  'getnada.com',
  'dispostable.com',
  'throwawaymail.com',
  'maildrop.cc',
  'mintemail.com',
  'moakt.com',
  'mohmal.com',
  'emailondeck.com',
  'discard.email',
  'spamgourmet.com',
  'mailnesia.com',
])

// Cache MX-lookup results for a short window so a burst of signups from the
// same domain (real or bot) doesn't hammer DNS on every request.
const mxCache = new Map<string, { ok: boolean; expiresAt: number }>()
const MX_CACHE_TTL_MS = 30 * 60 * 1000

async function domainHasMx(domain: string): Promise<boolean> {
  const cached = mxCache.get(domain)
  if (cached && Date.now() < cached.expiresAt) return cached.ok
  let ok: boolean
  try {
    const records = await dns.resolveMx(domain)
    ok = records.length > 0
  } catch {
    // Some real mail providers (rare, but it happens) rely on an A/AAAA
    // fallback instead of an MX record — RFC 5321 allows this. Only treat
    // the domain as dead if it has no mail route at all.
    try {
      const addrs = await dns.resolve(domain)
      ok = addrs.length > 0
    } catch {
      ok = false
    }
  }
  mxCache.set(domain, { ok, expiresAt: Date.now() + MX_CACHE_TTL_MS })
  return ok
}

/**
 * Checks that `email` is well-formed, not from a known disposable-email
 * domain, and that its domain can actually receive mail. This is meant for
 * signup/registration flows — it's a real (if imperfect) filter against
 * bot accounts that use throwaway or nonexistent domains, without needing
 * any paid verification API.
 */
export async function isGenuineEmail(
  email: unknown,
): Promise<{ valid: true } | { valid: false; reason: string }> {
  if (typeof email !== 'string') {
    return { valid: false, reason: 'Enter a valid email address.' }
  }
  const normalized = email.trim().toLowerCase()
  if (!EMAIL_RE.test(normalized)) {
    return { valid: false, reason: 'Enter a valid email address.' }
  }
  const domain = normalized.slice(normalized.lastIndexOf('@') + 1)
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      reason: 'Please use a permanent email address to register.',
    }
  }
  const hasMx = await domainHasMx(domain)
  if (!hasMx) {
    return {
      valid: false,
      reason:
        "We couldn't verify that email domain. Please check it and try again.",
    }
  }
  return { valid: true }
}
