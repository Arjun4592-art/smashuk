import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
function loadEnvLocal() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const OWNER_EMAIL = process.env.MEDUSA_ADMIN_EMAIL;
const OWNER_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD;
async function main() {
  if (!OWNER_EMAIL || !OWNER_PASSWORD) {
    console.error('Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD (in .env.local or inline) before running.');
    process.exit(1);
  }
  const loginRes = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: OWNER_EMAIL,
      password: OWNER_PASSWORD
    })
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok || !loginData.token) {
    console.error('Login failed:', loginData);
    process.exit(1);
  }
  const token = loginData.token as string;
  const authHeader = {
    Authorization: `Bearer ${token}`
  };
  const custRes = await fetch(`${MEDUSA_URL}/admin/customers?limit=1000&fields=id,email,first_name,last_name,phone,created_at`, {
    headers: authHeader
  });
  const custData = await custRes.json();
  const customers = custData.customers ?? [];
  const ordersRes = await fetch(`${MEDUSA_URL}/admin/orders?limit=1000&fields=customer_id,total,display_id`, {
    headers: authHeader
  });
  const ordersData = await ordersRes.json();
  const orderCountByCustomer = new Map<string, {
    count: number;
    total: number;
  }>();
  for (const o of ordersData.orders ?? []) {
    if (!o.customer_id) continue;
    const existing = orderCountByCustomer.get(o.customer_id) ?? {
      count: 0,
      total: 0
    };
    existing.count += 1;
    existing.total += o.total ?? 0;
    orderCountByCustomer.set(o.customer_id, existing);
  }
  const byPhone = new Map<string, any[]>();
  const synthetic: any[] = [];
  for (const c of customers) {
    const phone = (c.phone ?? '').replace(/\D/g, '');
    if (phone) {
      const list = byPhone.get(phone) ?? [];
      list.push(c);
      byPhone.set(phone, list);
    }
    if (/^pos-|^walkin@/i.test(c.email ?? '')) {
      synthetic.push(c);
    }
  }
  let foundGroup = false;
  for (const [phone, group] of byPhone) {
    if (group.length < 2) continue;
    foundGroup = true;
    for (const c of group) {
      const stats = orderCountByCustomer.get(c.id) ?? {
        count: 0,
        total: 0
      };
    }
  }
  if (!foundGroup) void 0;
  for (const c of synthetic) {
    const stats = orderCountByCustomer.get(c.id) ?? {
      count: 0,
      total: 0
    };
  }
}
main().catch(err => {
  console.error(err);
  process.exit(1);
});
