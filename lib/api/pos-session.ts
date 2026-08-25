import 'server-only';
import { medusaServiceFetch } from '@/lib/api/medusa-service-token';
export async function startPosSession(staffId: string): Promise<string> {
  const sessionId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await medusaServiceFetch(`/admin/users/${staffId}`, {
    method: 'POST',
    body: JSON.stringify({
      metadata: {
        activeSessionId: sessionId,
        activeSessionAt: new Date().toISOString()
      }
    })
  }).catch(() => {});
  return sessionId;
}
export function isPosSessionValid(metadata: Record<string, any> | null | undefined, sessionId: string | undefined): boolean {
  if (!sessionId) return true;
  const active = metadata?.activeSessionId;
  if (!active) return true;
  return active === sessionId;
}
