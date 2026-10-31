import type { Instrumentation } from 'next'

const WINDOW_MS = 60_000
const MAX_ALERTS_PER_WINDOW = 5
const recent = new Map<string, number>() // fingerprint -> last alert time
let windowStart = Date.now()
let alertsInWindow = 0

function shouldAlert(fingerprint: string): boolean {
  const now = Date.now()
  if (now - windowStart > WINDOW_MS) {
    windowStart = now
    alertsInWindow = 0
  }
  // Same error again within 10 minutes: log it, don't re-alert.
  const last = recent.get(fingerprint)
  if (last && now - last < 10 * 60_000) return false
  if (alertsInWindow >= MAX_ALERTS_PER_WINDOW) return false
  if (recent.size > 500) recent.clear()
  recent.set(fingerprint, now)
  alertsInWindow++
  return true
}

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  const error = err as Error & { digest?: string }
  const path = (request.path ?? '').split('?')[0]
  const entry = {
    level: 'error',
    time: new Date().toISOString(),
    method: request.method,
    path,
    routePath: context.routePath,
    routeType: context.routeType,
    digest: error.digest,
    message: String(error.message ?? error).slice(0, 500),
    stack: String(error.stack ?? '')
      .split('\n')
      .slice(0, 6)
      .join('\n'),
  }
  console.error(JSON.stringify(entry))

  const url = process.env.ERROR_WEBHOOK_URL
  if (!url) return
  const fingerprint = `${context.routePath}|${entry.message.slice(0, 120)}`
  if (!shouldAlert(fingerprint)) return
  const text = `Storefront error on ${request.method} ${path}\n${entry.message}`
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `text` is Slack's field, `content` is Discord's.
      body: JSON.stringify({ text, content: text.slice(0, 1900) }),
      signal: AbortSignal.timeout(4_000),
    })
  } catch {
    // Never let alerting break the request that already failed.
  }
}
