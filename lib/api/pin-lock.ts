import 'server-only';
import { medusaServiceFetch } from '@/lib/api/medusa-service-token';
const MAX_PIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000;
export function checkPinLock(metadata: Record<string, any> | null | undefined): {
  locked: boolean;
  remaining?: number;
} {
  const lockedUntil = Number(metadata?.pinLockedUntil ?? 0);
  if (!lockedUntil) return {
    locked: false
  };
  const now = Date.now();
  if (now < lockedUntil) {
    return {
      locked: true,
      remaining: Math.ceil((lockedUntil - now) / 1000)
    };
  }
  return {
    locked: false
  };
}
export async function recordPinFailure(staffId: string, metadata: Record<string, any> | null | undefined): Promise<number> {
  const now = Date.now();
  const previousLockedUntil = Number(metadata?.pinLockedUntil ?? 0);
  const stillCounting = previousLockedUntil === 0 || now < previousLockedUntil;
  const previousCount = stillCounting ? Number(metadata?.pinFailCount ?? 0) : 0;
  const count = previousCount + 1;
  const lockedUntil = count >= MAX_PIN_ATTEMPTS ? now + LOCK_DURATION_MS : 0;
  await medusaServiceFetch(`/admin/users/${staffId}`, {
    method: 'POST',
    body: JSON.stringify({
      metadata: {
        pinFailCount: count,
        pinLockedUntil: lockedUntil || ''
      }
    })
  }).catch(() => {});
  return count;
}
export async function clearPinLock(staffId: string): Promise<void> {
  await medusaServiceFetch(`/admin/users/${staffId}`, {
    method: 'POST',
    body: JSON.stringify({
      metadata: {
        pinFailCount: '',
        pinLockedUntil: ''
      }
    })
  }).catch(() => {});
}
export { MAX_PIN_ATTEMPTS };
