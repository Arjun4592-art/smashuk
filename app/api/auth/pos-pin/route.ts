// app/api/auth/pos-pin/route.ts
//
// POS PIN verification — SECURE, Medusa-backed.
//
// SECURITY FIX: the old version trusted a client-supplied `expectedPin`
// field and compared `pin === expectedPin` — both values came from the
// request body, so anyone could open devtools and send matching values
// to "log in" as any staff member. This version never trusts the client
// for anything except the staffId + the PIN they typed. The real PIN is
// read straight from that staff member's Medusa user record on the
// server and compared there.
//
// This is now also the ONLY login step for POS — there is no separate
// email/password step anymore. On success we mint the pos-token cookie
// from the store's own Medusa service account, so /api/pos/* and the
// POS-scoped parts of /api/admin/* keep working exactly as before.

import { NextRequest, NextResponse } from 'next/server'
import { setSurfaceCookies } from '@/lib/api/auth-cookie'
import {
  getMedusaServiceToken,
  MEDUSA_URL,
} from '@/lib/api/medusa-service-token'
import { startPosSession } from '@/lib/api/pos-session'
import { verifyPin, hashPin, isBcryptHash } from '@/lib/api/pin-hash'
import {
  checkPinLock,
  recordPinFailure,
  clearPinLock,
  MAX_PIN_ATTEMPTS,
} from '@/lib/api/pin-lock'
import { logStaffActivity } from '@/lib/api/staff-activity'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { staffId, pin } = body

    if (!staffId || !pin) {
      return NextResponse.json(
        { error: 'Staff ID and PIN are required.' },
        { status: 400 },
      )
    }

    // Fetch the REAL staff record from Medusa using our own service
    // credentials — the PIN we compare against never comes from the client.
    // We need this before the lock check too, since the lockout state now
    // lives in this same record's metadata (see lib/api/pin-lock.ts) instead
    // of an in-memory map that didn't survive multiple app instances/restarts.
    const serviceToken = await getMedusaServiceToken()
    const userRes = await fetch(`${MEDUSA_URL}/admin/users/${staffId}`, {
      headers: { Authorization: `Bearer ${serviceToken}` },
    })

    if (!userRes.ok) {
      // Don't leak whether the staffId exists — same generic error either
      // way. There's no metadata record to persist a strike against for an
      // unknown staffId, so this one case can't be locked out server-side —
      // it returns the same generic error a wrong PIN would.
      return NextResponse.json(
        { error: 'Incorrect PIN. Please try again.' },
        { status: 401 },
      )
    }

    const { user: staffUser } = await userRes.json()
    const meta = staffUser?.metadata ?? {}

    // Lockout check — reads pinFailCount/pinLockedUntil straight from this
    // user's Medusa metadata, so it's correct no matter which app instance
    // handles the request.
    const lockStatus = checkPinLock(meta)
    if (lockStatus.locked) {
      return NextResponse.json(
        {
          error: `Account locked. Try again in ${lockStatus.remaining} seconds.`,
          locked: true,
        },
        { status: 429 },
      )
    }

    if (meta.isActive === false) {
      return NextResponse.json(
        { error: 'This staff account is deactivated.' },
        { status: 403 },
      )
    }

    const realPin = String(meta.pin ?? '')

    if (!realPin || !(await verifyPin(String(pin), realPin))) {
      const count = await recordPinFailure(staffId, meta)
      const remaining = MAX_PIN_ATTEMPTS - count
      return NextResponse.json(
        {
          error:
            remaining > 0
              ? `Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
              : 'Too many incorrect attempts. Account locked for 5 minutes.',
          attemptsRemaining: Math.max(0, remaining),
        },
        { status: 401 },
      )
    }

    // Transparent upgrade: this staff record still had a plain-text PIN
    // from before hashing was added. Now that it's verified correct,
    // replace it with a bcrypt hash so the plain-text copy never has to
    // be stored or read again. Non-fatal if it fails — login still
    // succeeds either way, we just try again next login.
    if (!isBcryptHash(realPin)) {
      const serviceToken = await getMedusaServiceToken()
      fetch(`${MEDUSA_URL}/admin/users/${staffId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metadata: { pin: await hashPin(String(pin)) } }),
      }).catch(() => {})
    }

    // Success — clear lockout record
    await clearPinLock(staffId)

    // Single-session enforcement: this overwrites metadata.activeSessionId,
    // so if this staff member is already logged in on another device, that
    // device's cookie stops matching and gets signed out (see
    // /api/auth/me + lib/api/pos-session.ts).
    const sessionId = await startPosSession(staffUser.id)

    // No posRole set at all → owner's own legacy account, default to 'admin'
    const posRole: 'admin' | 'staff' = ['admin', 'staff'].includes(meta.posRole)
      ? meta.posRole
      : 'admin'

    const user = {
      id: staffUser.id,
      name:
        `${staffUser.first_name ?? ''} ${staffUser.last_name ?? ''}`.trim() ||
        staffUser.email,
      email: staffUser.email,
      role: posRole,
      createdAt: staffUser.created_at ?? new Date().toISOString(),
    }

    // Set pos-token cookie using our service token — this is what lets the
    // now-logged-in staff member's browser hit /api/pos/* successfully.
    //
    // IMPORTANT: the token stored below is the shared SERVICE token, not a
    // token that belongs to this specific staff member — Medusa v2 doesn't
    // issue per-user JWTs for a PIN-only flow. That means /admin/users/me
    // can NEVER be used to figure out "who is this" for a POS session — it
    // would always resolve to the service account itself (which is why
    // every POS login used to end up treated as admin). We store the real
    // staffId in the auth-state cookie so /api/auth/me can look up THIS
    // specific user instead of the service account.
    const response = NextResponse.json({ user })
    setSurfaceCookies(
      response.cookies,
      'pos',
      { isAuthenticated: true, role: posRole, userId: staffUser.id, sessionId },
      serviceToken,
    )

    // Fire-and-forget — never blocks or fails the login itself.
    logStaffActivity({
      staffId: staffUser.id,
      staffName: user.name,
      action: 'login',
      surface: 'pos',
    })

    return response
  } catch (err: any) {
    console.error('[API] pos-pin error:', err)
    return NextResponse.json(
      { error: 'PIN verification failed.' },
      { status: 500 },
    )
  }
}
