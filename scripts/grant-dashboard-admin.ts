import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({
  path: path.resolve(process.cwd(), '.env.local')
});
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD;
const TARGET_EMAIL = process.argv[2] ?? ADMIN_EMAIL;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD in .env.local before running this script.');
  process.exitCode = 1;
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
async function main() {
  if (!TARGET_EMAIL) {
    console.error('❌ No target email — pass one as an argument or set MEDUSA_ADMIN_EMAIL.');
    process.exitCode = 1;
    return;
  }
  const token = await getToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  const {
    users
  } = await fetch(`${MEDUSA_URL}/admin/users?email=${encodeURIComponent(TARGET_EMAIL)}`, {
    headers
  }).then(r => r.json());
  const user = users?.[0];
  if (!user) {
    console.error(`❌ No Medusa admin user found with email ${TARGET_EMAIL}`);
    console.error('   (This must be an existing Medusa admin user — create one first with');
    console.error("   `npx medusa user -e ... -p ...` if it doesn't exist yet.)");
    process.exitCode = 1;
    return;
  }
  const res = await fetch(`${MEDUSA_URL}/admin/users/${user.id}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      metadata: {
        ...(user.metadata ?? {}),
        role: 'admin'
      }
    })
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`❌ Failed to update user: ${err.slice(0, 300)}`);
    process.exitCode = 1;
    return;
  }
}
main().catch(err => {
  console.error('❌', err.message);
  process.exitCode = 1;
});
