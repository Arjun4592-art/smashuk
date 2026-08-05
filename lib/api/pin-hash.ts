// lib/api/pin-hash.ts
//
// SERVER-ONLY. One-way (bcrypt) hashing for POS staff PINs.
//
// PINs used to be stored as plain text in metadata.pin and compared with
// `===`. That meant:
//   - anyone who could read a staff record (including via the admin API)
//     got everyone's real login PIN back, not just their own
//   - a database/API leak would hand over every staff member's login
//     credential directly
//
// bcrypt hashes are one-way: we can check "does this PIN match?" without
// ever being able to recover the original PIN from what's stored. This
// intentionally means the dashboard can no longer show you an existing
// PIN — only let you set a new one (see the "Reset PIN" flow in
// app/dashboard/staff/page.tsx, which already only ever writes a new PIN
// and never reads one back).

import 'server-only'
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS)
}

// bcrypt hashes always look like $2a$.. / $2b$.. / $2y$.. — anything else
// stored in metadata.pin is a leftover plain-text PIN from before this
// feature existed.
export function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(value)
}

/**
 * Verifies a submitted PIN against whatever is stored in metadata.pin.
 * Supports plain-text values for a one-time transparent upgrade: if the
 * stored value isn't a bcrypt hash yet, it falls back to a direct string
 * compare so staff created before this change can still log in — the
 * caller (see /api/auth/pos-pin) then re-saves the PIN as a hash so the
 * plain-text copy never has to be read again.
 */
export async function verifyPin(
  submittedPin: string,
  storedPin: string,
): Promise<boolean> {
  if (!storedPin) return false
  if (isBcryptHash(storedPin)) {
    return bcrypt.compare(submittedPin, storedPin)
  }
  return submittedPin === storedPin
}
