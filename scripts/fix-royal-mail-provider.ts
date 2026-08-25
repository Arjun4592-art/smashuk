import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({
  path: path.resolve(process.cwd(), '.env.local')
});
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD;
const APPLY = process.argv.includes('--apply');
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
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.message ?? `POST ${p} failed (${res.status}): ${text.slice(0, 300)}`);
  return data;
}
async function medusaDelete(token: string, p: string) {
  const res = await fetch(`${MEDUSA_URL}${p}`, {
    method: 'DELETE',
    headers: headers(token)
  });
  if (!res.ok) throw new Error(`DELETE ${p} failed (${res.status}): ${await res.text()}`);
  return res.json().catch(() => ({}));
}
const isRoyalMail = (id: string) => /royal[-_ ]?mail/i.test(id ?? '');
const isManual = (id: string) => /manual/i.test(id ?? '');
const isPickupName = (name: string) => /pickup|store|collect/i.test(name ?? '');
async function main() {
  const token = await getToken();
  const {
    fulfillment_providers
  } = await medusaGet(token, '/admin/fulfillment-providers');
  const providers: {
    id: string;
  }[] = fulfillment_providers ?? [];
  for (const p of providers) void 0;
  const royalMail = providers.find(p => isRoyalMail(p.id));
  const manual = providers.find(p => isManual(p.id));
  if (!royalMail) {
    console.error('❌ No fulfillment provider matching "royal-mail" is registered on this backend.\n' + "   This means the backend either hasn't deployed the royal-mail module/medusa-config.ts\n" + "   change yet, or hasn't been restarted since it was added. Fix that first — this script\n" + "   can't wire anything to a provider that doesn't exist yet.");
    process.exitCode = 1;
    return;
  }
  if (manual) void 0;
  const {
    shipping_options
  } = await medusaGet(token, '/admin/shipping-options?limit=200&fields=id,name,provider_id,service_zone_id,shipping_profile_id,price_type,*type,*prices,*rules');
  const options: any[] = shipping_options ?? [];
  const deliveryOptions = options.filter(o => {
    const enabledInStorePickupRule = (o.rules ?? []).some((r: any) => r.attribute === 'enabled_in_store' && r.value === 'true');
    return !isPickupName(o.name) && !enabledInStorePickupRule;
  });
  if (deliveryOptions.length === 0) {
    return;
  }
  const broken: any[] = [];
  for (const o of deliveryOptions) {
    const ok = o.provider_id === royalMail.id;
    if (!ok) broken.push(o);
  }
  if (broken.length === 0) {
    return;
  }
  if (!APPLY) {
    return;
  }
  for (const o of broken) {
    try {
      await medusaPost(token, `/admin/shipping-options/${o.id}`, {
        provider_id: royalMail.id
      });
    } catch (updateErr: any) {
      console.warn(`   ⚠ In-place update rejected by Medusa (${updateErr.message}).`);
      const gbpPrice = (o.prices ?? []).find((p: any) => p.currency_code === 'gbp');
      try {
        await medusaDelete(token, `/admin/shipping-options/${o.id}`);
        const recreated = await medusaPost(token, '/admin/shipping-options', {
          name: o.name,
          service_zone_id: o.service_zone_id,
          shipping_profile_id: o.shipping_profile_id,
          provider_id: royalMail.id,
          price_type: o.price_type ?? 'flat',
          type: {
            label: o.name,
            description: `${o.name} delivery.`,
            code: o.type?.code ?? 'royal_mail'
          },
          data: {
            name: o.name
          },
          rules: o.rules ?? [],
          prices: gbpPrice ? [{
            currency_code: 'gbp',
            amount: gbpPrice.amount,
            rules: []
          }] : []
        });
      } catch (recreateErr: any) {
        console.error(`   ❌ Recreate also failed: ${recreateErr.message}`);
        console.error("      You'll need to fix this one by hand in Medusa Admin -> Settings -> Locations & Shipping.");
      }
    }
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
