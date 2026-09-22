import { NextRequest } from 'next/server'

// Simple in-memory sliding-window limiter — same pattern already used in
// app/api/auth/customer-login and app/api/auth/admin-login. Not shared
// across processes (see note below), but it's enough to stop a script from
// hammering a public form thousands of times a minute.
//
// NOTE: if this app ever runs under PM2 in `cluster` mode (multiple Node
// processes behind one port), this Map is per-process, so the effective
// limit is (MAX_ATTEMPTS * number of PM2 instances). If you're seeing this
// limiter not hold under load, check `pm2 ls` — for `exec_mode: fork` (a
// single instance) this is a non-issue. A durable fix would move this to
// Redis/Medusa, but that's more than this endpoint needs today.
const buckets = new Map<
  string,
  {
    count: number
    resetAt: number
  }
>()
const MAX_BUCKET_MAP_SIZE = 5000

function pruneIfNeeded(now: number) {
  if (buckets.size <= MAX_BUCKET_MAP_SIZE) return
  for (const [k, v] of buckets.entries()) {
    if (now > v.resetAt) buckets.delete(k)
  }
}

/**
 * Returns true if `key` has exceeded `max` hits within `windowMs`.
 * Call once per request, before doing any real work (and definitely before
 * sending any email).
 */
export function isRateLimited(
  key: string,
  max: number,
  windowMs: number,
): boolean {
  const now = Date.now()
  pruneIfNeeded(now)
  const entry = buckets.get(key)
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  entry.count += 1
  return entry.count > max
}

/**
 * Best-effort client IP for rate-limit keys. Behind a reverse proxy
 * (CyberPanel/OpenLiteSpeed, Vercel, etc.) this relies on x-forwarded-for
 * being set correctly by the proxy — it's not spoof-proof against a
 * misconfigured proxy, but it's the same approach the login routes already
 * use.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
