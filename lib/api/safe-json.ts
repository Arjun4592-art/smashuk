// lib/api/safe-json.ts
//
// SHARED. res.json() on a non-JSON response (e.g. Medusa returning an HTML
// 502/504 error page because it's unreachable, or a plain-text 500) throws
// — which, if not wrapped, turns into an opaque 500 with no useful message
// for either the caller or the server logs. This wraps that safely and
// logs the real underlying response server-side so a "500"/"400" in the
// browser network tab has an actual cause attached to it.
//
// Originally written ad-hoc in app/api/store/payment/route.ts — centralized
// here so every proxy route gets the same protection.

export async function safeJson(res: Response, label: string) {
  try {
    return await res.json()
  } catch {
    const text = await res.text().catch(() => '')
    console.error(
      `[${label}] returned non-JSON (${res.status}):`,
      text.slice(0, 300),
    )
    return {
      error: `${label} failed (${res.status}) — backend may be unreachable or misconfigured.`,
    }
  }
}
