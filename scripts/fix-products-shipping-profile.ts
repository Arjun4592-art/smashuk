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
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status}): ${await res.text()}`);
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
    throw new Error(`POST ${path} failed (${res.status}): ${err.slice(0, 300)}`);
  }
  return res.json();
}
async function medusaDelete(token: string, path: string) {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    method: 'DELETE',
    headers: headers(token)
  });
  return res.ok;
}
async function main() {
  const token = await getToken();
  const {
    shipping_options: allExistingOptions
  } = await medusaGet(token, '/admin/shipping-options?limit=100');
  const workingOption = (allExistingOptions ?? []).find((o: any) => !/^store pickup/i.test(o.name ?? ''));
  let defaultProfile: any;
  if (workingOption) {
    const {
      shipping_option
    } = await medusaGet(token, `/admin/shipping-options/${workingOption.id}?fields=*shipping_profile`).catch(() => ({
      shipping_option: null
    }));
    if (shipping_option?.shipping_profile) {
      defaultProfile = shipping_option.shipping_profile;
    }
  }
  if (!defaultProfile) {
    const {
      shipping_profiles: profiles
    } = await medusaGet(token, '/admin/shipping-profiles?limit=50');
    defaultProfile = (profiles ?? []).find((p: any) => p.type === 'default') ?? (profiles ?? []).find((p: any) => /default/i.test(p.name ?? ''));
    if (!defaultProfile) {
      const created = await medusaPost(token, '/admin/shipping-profiles', {
        name: 'Default Shipping Profile',
        type: 'default'
      });
      defaultProfile = created.shipping_profile;
    }
  }
  const allProducts: any[] = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const {
      products,
      count
    } = await medusaGet(token, `/admin/products?limit=${limit}&offset=${offset}&fields=id,title,+shipping_profile.id`);
    allProducts.push(...products);
    offset += limit;
    if (offset >= count || products.length === 0) break;
  }
  const unlinked = allProducts.filter(p => !p.shipping_profile?.id);
  if (unlinked.length > 0) {
    let done = 0;
    for (const p of unlinked) {
      await medusaPost(token, `/admin/products/${p.id}`, {
        shipping_profile_id: defaultProfile.id
      });
      done++;
      if (done % 20 === 0 || done === unlinked.length) {}
    }
  } else {}
  const location = await medusaGet(token, '/admin/stock-locations?limit=1').then(d => d.stock_locations?.[0]).catch(() => null);
  if (!location) {
    console.error('❌ No stock location found — set one up in Medusa Admin first.');
    process.exit(1);
  }
  const locationWithSets = await medusaGet(token, `/admin/stock-locations/${location.id}?fields=*fulfillment_sets,*fulfillment_sets.service_zones`).catch(() => null);
  const fulfillmentSets = locationWithSets?.stock_location?.fulfillment_sets ?? [];
  const fulfillmentSet = fulfillmentSets.find((fs: any) => fs.type === 'pickup') ?? fulfillmentSets.find((fs: any) => /pickup/i.test(fs.name ?? '')) ?? fulfillmentSets[0];
  if (!fulfillmentSet) {
    console.error('❌ No fulfillment set found for that location — configure Pickup in Admin → Locations & Shipping first.');
    process.exit(1);
  }
  const serviceZone = fulfillmentSet.service_zones?.[0];
  if (!serviceZone) {
    console.error(`❌ The "${fulfillmentSet.name}" fulfillment set has no service zone yet — add one covering the UK first.`);
    process.exit(1);
  }
  const {
    fulfillment_providers
  } = await medusaGet(token, '/admin/fulfillment-providers').catch(() => ({
    fulfillment_providers: []
  }));
  const providerId = (fulfillment_providers ?? [])[0]?.id ?? 'manual_manual';
  const {
    shipping_options: existingOptions
  } = await medusaGet(token, '/admin/shipping-options?limit=100');
  const oldPickupOptions = (existingOptions ?? []).filter((o: any) => /^store pickup/i.test(o.name ?? ''));
  for (const opt of oldPickupOptions) {
    await medusaDelete(token, `/admin/shipping-options/${opt.id}`);
  }
  await medusaPost(token, '/admin/shipping-options', {
    name: 'Store Pickup (Free)',
    service_zone_id: serviceZone.id,
    shipping_profile_id: defaultProfile.id,
    provider_id: providerId,
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
