// Server-only in-memory single-use cache for receipt HTML served to Star
// PassPRNT via its `url` query param.
//
// WHY THIS EXISTS: PassPRNT's small test page embeds its HTML directly in
// the intent URI's `html` query param, which works fine because it's tiny.
// A real receipt — full store header, every line item, tax/discount/split
// payment breakdown — is a lot more HTML, and once URL-encoded into an
// Android `intent://...#Intent;...;end` string, a receipt with more than a
// handful of items can push the whole URI past the point where Chrome/
// Android silently fails to launch the target app at all. There's no
// exception thrown in that case — window.location.href just does nothing
// visible, which is exactly "test print works, real receipt does nothing".
//
// The fix: only the *test* page still uses inline `html=`. Real receipts
// go through here instead — the HTML is stashed server-side and PassPRNT
// is given a short `url=` pointing at it, so the intent URI stays tiny
// regardless of receipt length; PassPRNT fetches the actual content itself
// over HTTP (this is a documented, supported PassPRNT mode, not a hack).
//
// A plain in-memory Map is enough here (not Redis/DB) because this app
// runs as a single persistent Node process under PM2 on the VPS, not
// serverless/edge — same assumption already made by lan-agent-transport.ts
// elsewhere in this codebase.

interface Entry {
  html: string
  expiresAt: number
}

// PassPRNT fetches within a couple of seconds in practice; this just
// bounds how long an unclaimed entry (e.g. printing was cancelled) sticks
// around in memory.
const TTL_MS = 2 * 60 * 1000

const store = new Map<string, Entry>()

function sweep(): void {
  const now = Date.now()
  for (const [token, entry] of store) {
    if (entry.expiresAt < now) store.delete(token)
  }
}

export function putReceiptHtml(html: string): string {
  sweep()
  const token = crypto.randomUUID()
  store.set(token, { html, expiresAt: Date.now() + TTL_MS })
  return token
}

// Single-use by design: PassPRNT only ever needs to fetch a given receipt
// once, and deleting on read means a token can't later be replayed to
// re-view a past order's contents.
export function takeReceiptHtml(token: string): string | null {
  const entry = store.get(token)
  if (!entry) return null
  store.delete(token)
  if (entry.expiresAt < Date.now()) return null
  return entry.html
}
