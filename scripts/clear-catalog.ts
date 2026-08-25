import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';
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
async function medusaDelete(token: string, path: string) {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    method: 'DELETE',
    headers: headers(token)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DELETE ${path} failed (${res.status}): ${err.slice(0, 200)}`);
  }
}
function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}
async function main() {
  const token = await getToken();
  const {
    count: productCount
  } = await medusaGet(token, '/admin/products?limit=1');
  const {
    count: categoryCount
  } = await medusaGet(token, '/admin/product-categories?limit=1');
  const ok = await confirm(`\n⚠️  This will PERMANENTLY DELETE all ${productCount} products and ${categoryCount} categories. Type "yes" to continue: `);
  if (!ok) {
    return;
  }
  let resDeleted = 0;
  while (true) {
    const {
      reservations
    } = await medusaGet(token, '/admin/reservations?limit=100&fields=id');
    if (!reservations || reservations.length === 0) break;
    for (const r of reservations) {
      try {
        await medusaDelete(token, `/admin/reservations/${r.id}`);
        resDeleted++;
      } catch (err: any) {
        console.warn(`  ⚠️  Could not delete reservation ${r.id}: ${err.message}`);
      }
    }
  }
  let deleted = 0;
  const failedProducts: string[] = [];
  while (true) {
    const {
      products
    } = await medusaGet(token, '/admin/products?limit=100&fields=id');
    if (!products || products.length === 0) break;
    let progressedThisPage = false;
    for (const p of products) {
      try {
        await medusaDelete(token, `/admin/products/${p.id}`);
        deleted++;
        progressedThisPage = true;
        if (deleted % 20 === 0) void 0;
      } catch (err: any) {
        console.warn(`  ⚠️  Could not delete product ${p.id}: ${err.message}`);
        failedProducts.push(p.id);
      }
    }
    if (!progressedThisPage) break;
  }
  if (failedProducts.length > 0) {
    failedProducts.forEach(id => void 0);
  }
  const {
    product_categories: categories
  } = await medusaGet(token, '/admin/product-categories?limit=200&fields=id,parent_category_id');
  const sorted = [...(categories ?? [])].sort((a, b) => a.parent_category_id ? -1 : b.parent_category_id ? 1 : 0);
  let catDeleted = 0;
  for (const c of sorted) {
    try {
      await medusaDelete(token, `/admin/product-categories/${c.id}`);
      catDeleted++;
    } catch (err: any) {
      console.warn(`  ⚠️  Could not delete category ${c.id}: ${err.message}`);
    }
  }
  let optDeleted = 0;
  const failedOptions: string[] = [];
  while (true) {
    const {
      product_options: options
    } = await medusaGet(token, '/admin/product-options?limit=100&fields=id');
    if (!options || options.length === 0) break;
    let progressedThisPage = false;
    for (const o of options) {
      try {
        await medusaDelete(token, `/admin/product-options/${o.id}`);
        optDeleted++;
        progressedThisPage = true;
      } catch (err: any) {
        console.warn(`  ⚠️  Could not delete option ${o.id}: ${err.message}`);
        failedOptions.push(o.id);
      }
    }
    if (!progressedThisPage) break;
  }
  if (failedOptions.length > 0) {
    failedOptions.forEach(id => void 0);
  }
}
main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
