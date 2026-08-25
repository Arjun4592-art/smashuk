import 'server-only';
import { medusaServiceFetch } from '@/lib/api/medusa-service-token';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/constants';
let cached: number | null = null;
let cachedAt = 0;
const CACHE_MS = 5 * 60 * 1000;
export async function getPublicFreeShippingThreshold(): Promise<number> {
  if (cached !== null && Date.now() - cachedAt < CACHE_MS) {
    return cached;
  }
  try {
    const res = await medusaServiceFetch('/admin/stores?limit=1&fields=id,metadata');
    if (!res.ok) throw new Error(`Medusa stores error: ${res.status}`);
    const {
      stores
    } = await res.json();
    const raw = stores?.[0]?.metadata?.shippingSettings?.freeShippingThreshold;
    const parsed = raw !== undefined ? Number(raw) : NaN;
    const result = Number.isFinite(parsed) ? parsed : FREE_SHIPPING_THRESHOLD;
    cached = result;
    cachedAt = Date.now();
    return result;
  } catch (err) {
    console.error('[shipping-settings] Falling back to default threshold:', err);
    return FREE_SHIPPING_THRESHOLD;
  }
}
