import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import bcrypt from 'bcryptjs';
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
function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}
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
  let hashedCount = 0;
  for (const u of users) {
    const meta = u.metadata ?? {};
    const pin = meta.pin;
    if (!pin || isBcryptHash(String(pin))) continue;
    const hashed = await bcrypt.hash(String(pin), 10);
    const res = await fetch(`${MEDUSA_URL}/admin/users/${u.id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        metadata: {
          pin: hashed
        }
      })
    });
    if (res.ok) {
      hashedCount++;
    } else {
      console.error(`  ✗ failed for ${u.email}:`, await res.json().catch(() => ({})));
    }
  }
}
main().catch(err => {
  console.error(err);
  process.exit(1);
});
