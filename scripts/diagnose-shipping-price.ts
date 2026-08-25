import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({
  path: path.resolve(process.cwd(), '.env.local')
});
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD in .env.local first.');
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
async function medusaGet(token: string, p: string) {
  const res = await fetch(`${MEDUSA_URL}${p}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error(`GET ${p} failed (${res.status}): ${await res.text()}`);
  return res.json();
}
async function main() {
  const token = await getToken();
  const {
    regions
  } = await medusaGet(token, '/admin/regions?limit=10');
  for (const r of regions ?? []) {}
  const {
    shipping_options
  } = await medusaGet(token, '/admin/shipping-options?limit=50&fields=*prices,*service_zone,*service_zone.geo_zones,*rules');
  for (const opt of shipping_options ?? []) {
    if (!opt.prices || opt.prices.length === 0) {} else {
      for (const pr of opt.prices) {}
      const regionCurrencies = new Set((regions ?? []).map((r: any) => r.currency_code));
      const matchesAnyRegionCurrency = opt.prices.some((pr: any) => regionCurrencies.has(pr.currency_code));
      if (!matchesAnyRegionCurrency) {}
    }
  }
}
main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
