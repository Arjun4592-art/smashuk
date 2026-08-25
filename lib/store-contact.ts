import 'server-only';
import { medusaServiceFetch } from '@/lib/api/medusa-service-token';
import { CONTACT_EMAIL, CONTACT_PHONE, SITE_NAME } from '@/lib/constants';
export interface PublicStoreContact {
  name: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
}
const FALLBACK: PublicStoreContact = {
  name: SITE_NAME,
  email: CONTACT_EMAIL,
  phone: CONTACT_PHONE,
  address: {
    line1: '112A Hulme High Street',
    line2: '',
    city: 'Manchester',
    state: 'Greater Manchester',
    pincode: 'M15 5JP',
    country: 'United Kingdom'
  }
};
let cached: PublicStoreContact | null = null;
let cachedAt = 0;
const CACHE_MS = 5 * 60 * 1000;
export async function getPublicStoreContact(): Promise<PublicStoreContact> {
  if (cached && Date.now() - cachedAt < CACHE_MS) {
    return cached;
  }
  try {
    const res = await medusaServiceFetch('/admin/stores?limit=1&fields=id,name,metadata');
    if (!res.ok) throw new Error(`Medusa stores error: ${res.status}`);
    const {
      stores
    } = await res.json();
    const store = stores?.[0];
    if (!store) throw new Error('No store found');
    const meta = store.metadata ?? {};
    const result: PublicStoreContact = {
      name: store.name || FALLBACK.name,
      email: meta.email || FALLBACK.email,
      phone: meta.phone || FALLBACK.phone,
      address: {
        line1: meta.address_line1 || FALLBACK.address.line1,
        line2: meta.address_line2 || FALLBACK.address.line2,
        city: meta.address_city || FALLBACK.address.city,
        state: meta.address_state || FALLBACK.address.state,
        pincode: meta.address_pincode || FALLBACK.address.pincode,
        country: meta.address_country || FALLBACK.address.country
      }
    };
    cached = result;
    cachedAt = Date.now();
    return result;
  } catch (err) {
    console.error('[store-contact] Falling back to defaults:', err);
    return FALLBACK;
  }
}
