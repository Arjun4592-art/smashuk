import { createHash, timingSafeEqual } from 'crypto'

/**
 * Constant-time string comparison for shared secrets (webhook / cron tokens).
 * Both sides are hashed first so the buffers are always the same length -
 * timingSafeEqual throws on unequal lengths, and checking the length first
 * would itself leak the secret's length.
 */
export function safeEqual(a: string | null | undefined, b: string): boolean {
  if (typeof a !== 'string' || !b) return false
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}
