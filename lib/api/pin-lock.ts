// lib/api/pin-lock.ts
//
// SERVER-ONLY. Enforces "N wrong PINs → temporary lockout" for POS login.
//
// BUG FIX: this used to live as an in-memory `Map<staffId, {count, lockedUntil}>`
// directly inside app/api/auth/pos-pin/route.ts. That works for a single
// long-running Node process, but breaks the exact same way single-session
// enforcement used to break (see pos-session.ts) — because the counter only
// exists in one process's RAM:
//   - Multiple app instances (serverless/Vercel, or a clustered/PM2 server)
//     each get their own Map. An attacker's 5 failed attempts can land on 5
//     different instances and never trip the lock at all.
//   - A restart/redeploy wipes the Map, silently un-locking every account.
//
// Fix: store the fail count + lock expiry in the SAME place pos-session.ts
// already trusts for cross-instance state — the staff member's own Medusa
// user metadata (metadata.pinFailCount / metadata.pinLockedUntil). That
// makes it correct no matter how many instances are running.

import 'server-only'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'

const MAX_PIN_ATTEMPTS = 5
const LOCK_DURATION_MS = 5 * 60 * 1000 // 5 minute lockout

export function checkPinLock(
  metadata: Record<string, any> | null | undefined,
): { locked: boolean; remaining?: number } {
  const lockedUntil = Number(metadata?.pinLockedUntil ?? 0)
  if (!lockedUntil) return { locked: false }
  const now = Date.now()
  if (now < lockedUntil) {
    return { locked: true, remaining: Math.ceil((lockedUntil - now) / 1000) }
  }
  return { locked: false }
}

/**
 * Records one failed PIN attempt for this staff member and persists the new
 * count/lock-expiry onto their Medusa user record. Returns the new count.
 * Pass the metadata you already fetched for this user to avoid re-reading it.
 */
export async function recordPinFailure(
  staffId: string,
  metadata: Record<string, any> | null | undefined,
): Promise<number> {
  const now = Date.now()
  const previousLockedUntil = Number(metadata?.pinLockedUntil ?? 0)
  // If the last lockout already expired, this failed attempt starts a fresh
  // count instead of adding onto a stale one.
  const stillCounting = previousLockedUntil === 0 || now < previousLockedUntil
  const previousCount = stillCounting ? Number(metadata?.pinFailCount ?? 0) : 0

  const count = previousCount + 1
  const lockedUntil = count >= MAX_PIN_ATTEMPTS ? now + LOCK_DURATION_MS : 0

  await medusaServiceFetch(`/admin/users/${staffId}`, {
    method: 'POST',
    body: JSON.stringify({
      metadata: {
        pinFailCount: count,
        // '' deletes the key in Medusa's metadata merge — keep it absent
        // rather than 0 when there's no active lock, same as before.
        pinLockedUntil: lockedUntil || '',
      },
    }),
  }).catch(() => {
    // Non-fatal — worst case this one attempt isn't persisted as a strike,
    // not that a legitimate cashier gets locked out.
  })

  return count
}

/** Clears the lockout record on a successful login. */
export async function clearPinLock(staffId: string): Promise<void> {
  await medusaServiceFetch(`/admin/users/${staffId}`, {
    method: 'POST',
    body: JSON.stringify({
      metadata: { pinFailCount: '', pinLockedUntil: '' },
    }),
  }).catch(() => {})
}

export { MAX_PIN_ATTEMPTS }
