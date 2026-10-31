import { fetchWithTimeout } from '@/lib/api/fetch-with-timeout'

/**
 * Cloudflare Turnstile verification (free, privacy-friendly CAPTCHA).
 *
 * Opt-in: when TURNSTILE_SECRET_KEY is not set this is a no-op that returns
 * ok, so nothing breaks before you create the keys. Once both
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY (browser) and TURNSTILE_SECRET_KEY (server)
 * are set, signups without a valid token are rejected.
 */
export function turnstileEnabled(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY
}

export async function verifyTurnstile(
  token: unknown,
  ip?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  if (typeof token !== 'string' || !token || token.length > 2048) return false
  try {
    const body = new URLSearchParams({ secret, response: token })
    if (ip && ip !== 'unknown') body.set('remoteip', ip)
    const res = await fetchWithTimeout(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body, timeoutMs: 5_000 },
    )
    if (!res.ok) return false
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    // Fail closed: if we can't verify, don't create the account.
    return false
  }
}
