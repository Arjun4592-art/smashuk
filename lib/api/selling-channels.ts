import 'server-only';
export type SellingChannel = 'both' | 'website' | 'store';
const CHANNEL_NAMES: Record<'website' | 'store', string> = {
  website: 'Website',
  store: 'Store'
};
let cache: {
  website?: string;
  store?: string;
} | null = null;
async function ensureChannel(key: 'website' | 'store', authorization: string, medusaUrl: string): Promise<string | undefined> {
  if (cache?.[key]) return cache[key];
  const name = CHANNEL_NAMES[key];
  const listRes = await fetch(`${medusaUrl}/admin/sales-channels?limit=100`, {
    headers: {
      Authorization: authorization
    }
  });
  const listData = await listRes.json().catch(() => ({}));
  let channel = (listData.sales_channels ?? []).find((c: any) => c.name?.toLowerCase() === name.toLowerCase());
  if (!channel) {
    const createRes = await fetch(`${medusaUrl}/admin/sales-channels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization
      },
      body: JSON.stringify({
        name,
        description: key === 'website' ? 'Products sold on the smashuk.co website' : 'Products sold in-store via POS'
      })
    });
    const createData = await createRes.json().catch(() => ({}));
    channel = createData.sales_channel;
  }
  if (channel?.id) {
    cache = {
      ...cache,
      [key]: channel.id
    };
    return channel.id;
  }
  return undefined;
}
export async function resolveSalesChannels(selling: SellingChannel | undefined, authorization: string, medusaUrl: string): Promise<{
  id: string;
}[] | undefined> {
  const choice = selling ?? 'both';
  try {
    const ids: string[] = [];
    if (choice === 'website' || choice === 'both') {
      const id = await ensureChannel('website', authorization, medusaUrl);
      if (id) ids.push(id);
    }
    if (choice === 'store' || choice === 'both') {
      const id = await ensureChannel('store', authorization, medusaUrl);
      if (id) ids.push(id);
    }
    if (ids.length > 0) return ids.map(id => ({
      id
    }));
  } catch (err) {
    console.warn('[selling-channels] resolve failed:', err);
  }
  try {
    const res = await fetch(`${medusaUrl}/admin/sales-channels?limit=1`, {
      headers: {
        Authorization: authorization
      }
    });
    const data = await res.json();
    const fallbackId = data.sales_channels?.[0]?.id;
    return fallbackId ? [{
      id: fallbackId
    }] : undefined;
  } catch {
    return undefined;
  }
}
export function inferSellingChannel(salesChannels: {
  name?: string;
}[] | undefined): SellingChannel {
  const names = new Set((salesChannels ?? []).map(c => c.name?.toLowerCase()).filter(Boolean));
  const hasWebsite = names.has('website');
  const hasStore = names.has('store');
  if (hasWebsite && hasStore) return 'both';
  if (hasStore) return 'store';
  if (hasWebsite) return 'website';
  return 'both';
}
