// lib/api/pos-session.ts
//
// SERVER-ONLY. Enforces "one active POS session per staff member".
//
// POS logs in with a shared service token (see medusa-service-token.ts),
// so we can't rely on Medusa issuing a distinct JWT per staff device the
// way we normally would to invalidate old sessions. Instead we mint our
// own random sessionId at login time and store it as the single source of
// truth in that staff member's Medusa user metadata
// (metadata.activeSessionId). Because it lives in Medusa — not in this
// server's memory — it works correctly even with multiple app instances
// or restarts.
//
// Flow:
//   1. Staff logs in on Device A → new sessionId "abc" is generated and
//      written to metadata.activeSessionId, and also stored in Device A's
//      pos-auth cookie.
//   2. Same staff logs in on Device B → new sessionId "xyz" overwrites
//      "abc" in metadata, and is stored in Device B's cookie.
//   3. Device A's cookie now holds "abc", which no longer matches
//      metadata.activeSessionId ("xyz") → next time Device A's session is
//      checked (see /api/auth/me), it comes back invalid and Device A is
//      signed out.

import 'server-only'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'

/**
 * Mints a new session for this staff member, invalidating any other
 * device currently logged in as them. Returns the new sessionId to be
 * stored in the pos-auth cookie.
 */
export async function startPosSession(staffId: string): Promise<string> {
  const sessionId =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  await medusaServiceFetch(`/admin/users/${staffId}`, {
    method: 'POST',
    body: JSON.stringify({
      metadata: {
        activeSessionId: sessionId,
        activeSessionAt: new Date().toISOString(),
      },
    }),
  }).catch(() => {
    // Non-fatal: if this write fails, login still proceeds — worst case
    // single-session enforcement is skipped for this login, not that the
    // staff member is locked out.
  })

  return sessionId
}

/**
 * True if `sessionId` (from the caller's pos-auth cookie) is still the
 * active session for `staffId` according to Medusa. Pass the already-
 * fetched metadata when you have it (e.g. /api/auth/me already fetched
 * the user) to avoid a duplicate network call.
 */
export function isPosSessionValid(
  metadata: Record<string, any> | null | undefined,
  sessionId: string | undefined,
): boolean {
  if (!sessionId) return true // older cookies minted before this feature — don't force-logout everyone
  const active = metadata?.activeSessionId
  if (!active) return true // staff record predates this feature
  return active === sessionId
}
