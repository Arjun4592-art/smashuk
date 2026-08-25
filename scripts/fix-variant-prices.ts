import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({
  path: path.resolve(process.cwd(), '.env.local')
});
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD;
const PRICE_THRESHOLD = 1000;
const APPLY = process.argv.includes('--apply');
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
function gbp(amount: number) {
  return `£${amount.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
async function main() {
  const token = await getToken();
  const res = await fetch(`${MEDUSA_URL}/admin/products?limit=1000&fields=id,title,status,*variants,*variants.prices`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error(`Fetch products failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const products: any[] = data.products ?? [];
  type Fix = {
    productTitle: string;
    productId: string;
    variantId: string;
    variantTitle: string;
    sku: string | null;
    priceId: string;
    oldAmount: number;
    newAmount: number;
  };
  const fixes: Fix[] = [];
  for (const p of products) {
    for (const v of p.variants ?? []) {
      for (const pr of v.prices ?? []) {
        if (pr.currency_code !== 'gbp') continue;
        if (typeof pr.amount === 'number' && pr.amount >= PRICE_THRESHOLD) {
          fixes.push({
            productTitle: p.title,
            productId: p.id,
            variantId: v.id,
            variantTitle: v.title,
            sku: v.sku ?? null,
            priceId: pr.id,
            oldAmount: pr.amount,
            newAmount: Math.round(pr.amount / 100 * 100) / 100
          });
        }
      }
    }
  }
  if (fixes.length === 0) {
    return;
  }
  for (const f of fixes) {}
  if (!APPLY) {
    return;
  }
  let okCount = 0;
  let failCount = 0;
  for (const f of fixes) {
    const updateRes = await fetch(`${MEDUSA_URL}/admin/products/${f.productId}/variants/${f.variantId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        prices: [{
          id: f.priceId,
          currency_code: 'gbp',
          amount: f.newAmount
        }]
      })
    });
    if (updateRes.ok) {
      okCount++;
    } else {
      failCount++;
    }
  }
}
main().catch(err => {
  console.error('Script failed:', err.message);
  process.exit(1);
});
