/**
 * fetch() with a hard timeout, and an opt-in retry with exponential backoff.
 *
 * Why this exists: a bare fetch() to Medusa or a third party has no timeout, so
 * one slow upstream can pin a Node request (and its PM2 worker) indefinitely.
 *
 * Retry rules are deliberately conservative:
 *  - only idempotent methods (GET/HEAD/OPTIONS/PUT/DELETE) are retried on
 *    network errors, timeouts, 429 and 502/503/504;
 *  - POST/PATCH are NEVER retried unless the caller sets `retryNonIdempotent`
 *    (do that only when the endpoint is idempotent or protected by a key),
 *    otherwise a retried "create order" could create two orders.
 */

const IDEMPOTENT = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'])
const RETRYABLE_STATUS = new Set([429, 502, 503, 504])

export interface FetchOptions extends RequestInit {
  /** Abort the request after this many ms. Default 10s. */
  timeoutMs?: number
}

export interface RetryOptions {
  /** Extra attempts after the first one. Default 2. */
  retries?: number
  /** First backoff delay. Default 300ms, then 600, 1200, ... */
  baseDelayMs?: number
  maxDelayMs?: number
  /** Allow retrying POST/PATCH. Off by default - see note above. */
  retryNonIdempotent?: boolean
}

function withTimeoutSignal(
  signal: AbortSignal | null | undefined,
  timeoutMs: number,
): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs)
  if (!signal) return timeout
  // AbortSignal.any exists on Node >= 20.3 (this project requires Node 20+).
  return AbortSignal.any([signal, timeout])
}

export function fetchWithTimeout(
  input: string | URL | Request,
  init: FetchOptions = {},
): Promise<Response> {
  const { timeoutMs = 10_000, signal, ...rest } = init
  return fetch(input, { ...rest, signal: withTimeoutSignal(signal, timeoutMs) })
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

/** Exponential backoff with "full jitter": random in [0, min(max, base*2^n)]. */
export function backoffDelay(
  attempt: number,
  baseDelayMs = 300,
  maxDelayMs = 5_000,
): number {
  const ceiling = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt)
  return Math.floor(Math.random() * ceiling)
}

function retryAfterMs(res: Response): number | null {
  const h = res.headers.get('retry-after')
  if (!h) return null
  const secs = Number(h)
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000)
  const date = Date.parse(h)
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null
}

export async function fetchWithRetry(
  input: string | URL | Request,
  init: FetchOptions = {},
  opts: RetryOptions = {},
): Promise<Response> {
  const {
    retries = 2,
    baseDelayMs = 300,
    maxDelayMs = 5_000,
    retryNonIdempotent = false,
  } = opts
  const method = (init.method ?? 'GET').toUpperCase()
  const canRetry = retryNonIdempotent || IDEMPOTENT.has(method)
  const maxAttempts = canRetry ? retries : 0

  let attempt = 0
  for (;;) {
    try {
      const res = await fetchWithTimeout(input, init)
      if (attempt < maxAttempts && RETRYABLE_STATUS.has(res.status)) {
        const wait = Math.min(
          maxDelayMs,
          retryAfterMs(res) ?? backoffDelay(attempt, baseDelayMs, maxDelayMs),
        )
        // Drain the body so the connection can be reused.
        await res.body?.cancel().catch(() => {})
        await sleep(wait)
        attempt++
        continue
      }
      return res
    } catch (err) {
      if (attempt >= maxAttempts) throw err
      await sleep(backoffDelay(attempt, baseDelayMs, maxDelayMs))
      attempt++
    }
  }
}
