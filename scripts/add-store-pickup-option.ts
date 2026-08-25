import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({
  path: path.resolve(process.cwd(), '.env.local')
});
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD in .env.local before running this script.');
  process.exit(1);
}
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
async function medusaGet(token: string, path: string) {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    headers: headers(token)
  });
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`);
  return res.json();
}
async function medusaPost(token: string, path: string, body: any) {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    method: 'POST',
    headers: {
      ...headers(token),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`POST ${path} failed (${res.status}): ${err.slice(0, 200)}`);
  }
  return res.json();
}
async function main() {
  const token = await getToken();
  const {
    shipping_options: existingOptions
  } = await medusaGet(token, '/admin/shipping-options?limit=50');
  const existingPickup = (existingOptions ?? []).find((o: any) => /pickup|store|collect/i.test(o.name ?? ''));
  if (existingPickup) {
    const delRes = await fetch(`${MEDUSA_URL}/admin/shipping-options/${existingPickup.id}`, {
      method: 'DELETE',
      headers: headers(token)
    });
    if (!delRes.ok) {
      console.error(`❌ Could not delete existing "${existingPickup.name}" (HTTP ${delRes.status}) — please delete it manually in Admin → Locations & Shipping first, then re-run.`);
      process.exit(1);
    }
  }
  const {
    fulfillment_providers
  } = await medusaGet(token, '/admin/fulfillment-providers').catch(() => ({
    fulfillment_providers: []
  }));
  const providers = fulfillment_providers ?? [];
  const location = await medusaGet(token, '/admin/stock-locations?limit=1').then(d => d.stock_locations?.[0]).catch(() => null);
  if (!location) {
    console.error('❌ No stock location found — set one up in Medusa Admin first.');
    process.exit(1);
  }
  const locationWithSets = await medusaGet(token, `/admin/stock-locations/${location.id}?fields=*fulfillment_sets,*fulfillment_sets.service_zones`).catch(() => null);
  const fulfillmentSets = locationWithSets?.stock_location?.fulfillment_sets ?? [];
  if (fulfillmentSets.length === 0) {
    console.error('❌ No fulfillment set found for that location — configure it in Medusa Admin first.');
    process.exit(1);
  }
  const fulfillmentSet = fulfillmentSets.find((fs: any) => fs.type === 'pickup') ?? fulfillmentSets.find((fs: any) => /pickup/i.test(fs.name ?? '')) ?? fulfillmentSets[0];
  const serviceZone = fulfillmentSet.service_zones?.[0];
  if (!serviceZone) {
    console.error(`❌ The "${fulfillmentSet.name}" fulfillment set has no service zone yet — add one in Admin → Locations & Shipping → ${fulfillmentSet.name} first (e.g. covering the UK).`);
    process.exit(1);
  }
  const workingOption = (existingOptions ?? []).find((o: any) => !/pickup|store|collect/i.test(o.name ?? ''));
  let shippingProfileId: string | undefined;
  let profileSourceLabel = '';
  if (workingOption) {
    const {
      shipping_option
    } = await medusaGet(token, `/admin/shipping-options/${workingOption.id}?fields=*shipping_profile`).catch(() => ({
      shipping_option: null
    }));
    shippingProfileId = shipping_option?.shipping_profile_id ?? shipping_option?.shipping_profile?.id;
    profileSourceLabel = `copied from existing option "${workingOption.name}"`;
  }
  if (!shippingProfileId) {
    const {
      shipping_profiles: shippingProfiles
    } = await medusaGet(token, '/admin/shipping-profiles?limit=50').catch(() => ({
      shipping_profiles: []
    }));
    const defaultProfile = (shippingProfiles ?? []).find((p: any) => p.type === 'default') ?? (shippingProfiles ?? []).find((p: any) => /default/i.test(p.name ?? '')) ?? (shippingProfiles ?? [])[0];
    shippingProfileId = defaultProfile?.id;
    profileSourceLabel = `fallback guess "${defaultProfile?.name}"`;
  }
  if (!shippingProfileId) {
    console.error('❌ No shipping profile found — set one up in Admin → Locations & Shipping → Shipping Profiles first.');
    process.exit(1);
  }
  await medusaPost(token, '/admin/shipping-options', {
    name: 'Store Pickup (Free)',
    service_zone_id: serviceZone.id,
    shipping_profile_id: shippingProfileId,
    provider_id: providers[0]?.id ?? 'manual_manual',
    price_type: 'flat',
    type: {
      label: 'Store Pickup',
      description: 'Collect your order in-store, free of charge.',
      code: 'store_pickup'
    },
    data: {
      name: 'Store Pickup (Free)'
    },
    rules: [{
      operator: 'eq',
      attribute: 'enabled_in_store',
      value: 'true'
    }],
    prices: [{
      currency_code: 'gbp',
      amount: 0,
      rules: []
    }]
  });
}
main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
