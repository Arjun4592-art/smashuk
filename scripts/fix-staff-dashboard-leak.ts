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
  const usersRes = await fetch(`${MEDUSA_URL}/admin/users?limit=1000`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const usersData = await usersRes.json();
  if (!usersRes.ok) {
    console.error('Failed to list users:', usersData);
    process.exit(1);
  }
  const users: any[] = usersData.users ?? [];
  let fixedCount = 0;
  for (const u of users) {
    const meta = u.metadata ?? {};
    const isRealOwner = u.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
    const hasDashboardFlag = meta.role === 'admin' || meta.role === 'owner';
    if (hasDashboardFlag && !isRealOwner) {
      const {
        role,
        ...restMeta
      } = meta;
      const patchRes = await fetch(`${MEDUSA_URL}/admin/users/${u.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metadata: {
            ...restMeta,
            role: null
          }
        })
      });
      if (!patchRes.ok) {
        console.error(`  -> FAILED to patch ${u.email}:`, await patchRes.text());
      } else {
        fixedCount++;
      }
    } else if (isRealOwner) {} else {}
  }
}
main().catch(err => {
  console.error(err);
  process.exit(1);
});
