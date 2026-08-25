import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({
  path: path.resolve(process.cwd(), '.env.local')
});
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD;
const STANDARD_SHIPPING_GBP = 4.99;
const FREE_SHIPPING_GBP = 0;
async function getToken(): Promise<string> {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    })
  });
  const data = await res.json();
  if (!res.ok || !data.token) throw new Error('Auth failed: ' + (data.message ?? res.status));
  return data.token as string;
}
function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`
  };
}
async function medusaGet(token: string, p: string) {
  const res = await fetch(`${MEDUSA_URL}${p}`, {
    headers: headers(token)
  });
  if (!res.ok) throw new Error(`GET ${p} failed (${res.status}): ${await res.text()}`);
  return res.json();
}
async function medusaPost(token: string, p: string, body: any) {
  const res = await fetch(`${MEDUSA_URL}${p}`, {
    method: 'POST',
    headers: {
      ...headers(token),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`POST ${p} failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  return res.json();
}
const isPickup = (name: string) => /pickup|store|collect/i.test(name ?? '');
const isFree = (name: string) => /free/i.test(name ?? '');
async function findMajorityShippingProfileId(token: string): Promise<string> {
  const allProducts: any[] = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const {
      products,
      count
    } = await medusaGet(token, `/admin/products?limit=${limit}&offset=${offset}&fields=id,+shipping_profile.id,+shipping_profile.name`);
    allProducts.push(...(products ?? []));
    offset += limit;
    if (offset >= (count ?? 0) || (products ?? []).length === 0) break;
  }
  const usage = new Map<string, {
    name: string;
    count: number;
  }>();
  for (const p of allProducts) {
    const profile = p.shipping_profile;
    if (!profile?.id) continue;
    const entry = usage.get(profile.id) ?? {
      name: profile.name,
      count: 0
    };
    entry.count++;
    usage.set(profile.id, entry);
  }
  if (usage.size === 0) {
    throw new Error(`No product has a shipping_profile assigned (scanned ${allProducts.length} products) - ` + 'assign a shipping profile to at least one product in Medusa Admin first.');
  }
  const [bestId, best] = [...usage.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  return bestId;
}
async function findShippingServiceZoneId(token: string): Promise<string> {
  const location = await medusaGet(token, '/admin/stock-locations?limit=1').then(d => d.stock_locations?.[0]);
  if (!location) throw new Error('No stock location found - set one up in Medusa Admin first.');
  const locationWithSets = await medusaGet(token, `/admin/stock-locations/${location.id}?fields=*fulfillment_sets,*fulfillment_sets.service_zones`);
  const fulfillmentSets = locationWithSets?.stock_location?.fulfillment_sets ?? [];
  if (fulfillmentSets.length === 0) {
    throw new Error(`No fulfillment set found for "${location.name}" - configure Locations & Shipping in Medusa Admin first.`);
  }
  const shippingSet = fulfillmentSets.find((fs: any) => fs.type === 'shipping') ?? fulfillmentSets.find((fs: any) => !/pickup/i.test(fs.name ?? '')) ?? fulfillmentSets[0];
  const serviceZone = shippingSet.service_zones?.[0];
  if (!serviceZone) {
    throw new Error(`The "${shippingSet.name}" fulfillment set has no service zone yet - add one in Admin -> ` + `Locations & Shipping -> ${shippingSet.name} first (e.g. covering the UK).`);
  }
  return serviceZone.id;
}
async function findRoyalMailProviderId(token: string): Promise<string> {
  const {
    fulfillment_providers
  } = await medusaGet(token, '/admin/fulfillment-providers').catch(() => ({
    fulfillment_providers: []
  }));
  const providers = fulfillment_providers ?? [];
  const royalMailProvider = providers.find((p: any) => /royal[-_ ]?mail/i.test(p.id ?? ''));
  if (!royalMailProvider) {
    throw new Error('No fulfillment provider matching "royal-mail" is registered on the backend.\n' + 'Found these instead: ' + (providers.map((p: any) => p.id).join(', ') || '(none)') + '\nCheck that the royal-mail module is added to medusa-config.ts and the backend has ' + 'been restarted, or run scripts/fix-royal-mail-provider.ts to diagnose an existing store.');
  }
  return royalMailProvider.id;
}
async function ensureOption(token: string, opts: {
  existing: any | undefined;
  name: string;
  amountGbp: number;
  serviceZoneId: string;
  shippingProfileId: string;
  providerId: string;
  code: string;
}) {
  const {
    existing,
    name,
    amountGbp,
    serviceZoneId,
    shippingProfileId,
    providerId,
    code
  } = opts;
  if (existing) {
    await medusaPost(token, `/admin/shipping-options/${existing.id}`, {
      prices: [{
        currency_code: 'gbp',
        amount: amountGbp,
        rules: []
      }]
    });
    return existing;
  }
  const created = await medusaPost(token, '/admin/shipping-options', {
    name,
    service_zone_id: serviceZoneId,
    shipping_profile_id: shippingProfileId,
    provider_id: providerId,
    price_type: 'flat',
    type: {
      label: name,
      description: `${name} delivery.`,
      code
    },
    data: {
      name
    },
    rules: [{
      operator: 'eq',
      attribute: 'enabled_in_store',
      value: 'true'
    }],
    prices: [{
      currency_code: 'gbp',
      amount: amountGbp,
      rules: []
    }]
  });
  const option = created.shipping_option ?? created;
  return option;
}
async function main() {
  const token = await getToken();
  const {
    shipping_options
  } = await medusaGet(token, '/admin/shipping-options?limit=50&fields=*prices,*rules');
  const options = shipping_options ?? [];
  for (const o of options) void 0;
  const existingRoyalMail = options.find((o: any) => !isPickup(o.name) && !isFree(o.name));
  const existingFreeShipping = options.find((o: any) => !isPickup(o.name) && isFree(o.name));
  let shippingProfileId: string | undefined;
  let serviceZoneId: string | undefined;
  let providerId: string | undefined;
  if (!existingRoyalMail || !existingFreeShipping) {
    shippingProfileId = await findMajorityShippingProfileId(token);
    serviceZoneId = await findShippingServiceZoneId(token);
    providerId = await findRoyalMailProviderId(token);
  }
  await ensureOption(token, {
    existing: existingRoyalMail,
    name: 'Royal Mail',
    amountGbp: STANDARD_SHIPPING_GBP,
    serviceZoneId: serviceZoneId!,
    shippingProfileId: shippingProfileId!,
    providerId: providerId!,
    code: 'royal_mail'
  });
  await ensureOption(token, {
    existing: existingFreeShipping,
    name: 'Free Shipping',
    amountGbp: FREE_SHIPPING_GBP,
    serviceZoneId: serviceZoneId!,
    shippingProfileId: shippingProfileId!,
    providerId: providerId!,
    code: 'free_shipping'
  });
  const {
    shipping_options: verify
  } = await medusaGet(token, '/admin/shipping-options?limit=50&fields=*prices');
  for (const o of verify ?? []) {
    if (isPickup(o.name)) continue;
    const priceLines = (o.prices ?? []).filter((p: any) => p.currency_code === 'gbp').map((p: any) => `£${p.amount} (rules: ${JSON.stringify(p.rules ?? [])})`).join(', ');
  }
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD in .env.local first.');
  process.exitCode = 1;
} else {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exitCode = 1;
  });
}
