import { NextRequest, NextResponse } from 'next/server'

/**
 * In-memory fixed-window rate limiter.
 *
 * Deployment note (PM2): the counters live in this process. Run the storefront
 * in `fork` mode with ONE instance (see ecosystem.config.cjs) and the limits
 * are exact. If you ever switch to `cluster` mode with N instances, the
 * effective limit becomes N x the configured one - move this to Redis then.
 *
 * The store hangs off globalThis so every route bundle shares one Map (Next can
 * evaluate this module more than once), and it has a hard size cap so a flood
 * of unique keys can't grow memory without bound.
 */
type Bucket = { count: number; resetAt: number }

const STORE_KEY = '__rateLimitBuckets'
const g = globalThis as unknown as Record<
  string,
  Map<string, Bucket> | undefined
>
const buckets: Map<string, Bucket> = (g[STORE_KEY] ??= new Map())

const SOFT_LIMIT = 5_000
const HARD_LIMIT = 20_000

function prune(now: number) {
  if (buckets.size <= SOFT_LIMIT) return
  for (const [k, v] of buckets) {
    if (now > v.resetAt) buckets.delete(k)
  }
  // Still too big (everything unexpired): drop the oldest entries. Map keeps
  // insertion order, so the first keys are the oldest.
  if (buckets.size > HARD_LIMIT) {
    const excess = buckets.size - HARD_LIMIT
    let i = 0
    for (const k of buckets.keys()) {
      buckets.delete(k)
      if (++i >= excess) break
    }
  }
}

export interface RateLimitResult {
  limited: boolean
  remaining: number
  retryAfterSec: number
}

/** Count one hit for `key`. Call once per request, before doing real work. */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now()
  prune(now)
  const entry = buckets.get(key)
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { limited: false, remaining: max - 1, retryAfterSec: 0 }
  }
  entry.count += 1
  const limited = entry.count > max
  return {
    limited,
    remaining: Math.max(0, max - entry.count),
    retryAfterSec: limited ? Math.ceil((entry.resetAt - now) / 1000) : 0,
  }
}

/** Boolean form kept for the existing callers (contact, newsletter, ...). */
export function isRateLimited(
  key: string,
  max: number,
  windowMs: number,
): boolean {
  return rateLimit(key, max, windowMs).limited
}

/**
 * Apply several limits at once (e.g. per-IP AND per-account). Every limit is
 * counted; the strictest result wins.
 */
export function rateLimitAll(
  limits: { key: string; max: number; windowMs: number }[],
): RateLimitResult {
  let worst: RateLimitResult = {
    limited: false,
    remaining: Infinity,
    retryAfterSec: 0,
  }
  for (const l of limits) {
    const r = rateLimit(l.key, l.max, l.windowMs)
    if (
      r.limited &&
      (!worst.limited || r.retryAfterSec > worst.retryAfterSec)
    ) {
      worst = r
    } else if (!worst.limited && r.remaining < worst.remaining) {
      worst = r
    }
  }
  return worst
}

export function tooManyRequests(
  retryAfterSec: number,
  message = 'Too many attempts. Please try again later.',
) {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.max(1, retryAfterSec)) },
    },
  )
}

/**
 * Client IP for rate-limit keys.
 *
 * x-forwarded-for is a list: "client-supplied..., ..., ip-added-by-nearest-
 * proxy". The LEFT-most entry is whatever the client chose to send, so keying
 * on it lets an attacker dodge every limit by sending a fresh fake header per
 * request. The RIGHT-most entry is the address your reverse proxy actually saw,
 * which can't be forged, so that is what we use.
 *
 * If you sit behind Cloudflare (or another proxy that sets a single trusted
 * header), set TRUSTED_IP_HEADER=cf-connecting-ip (or x-real-ip) in the env.
 */
export function getClientIp(req: NextRequest): string {
  const trusted = process.env.TRUSTED_IP_HEADER?.toLowerCase()
  if (trusted) {
    const v = req.headers.get(trusted)
    if (v) return v.split(',')[0].trim()
  }
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length) return parts[parts.length - 1]
  }
  return req.headers.get('x-real-ip') ?? 'unknown'
}
