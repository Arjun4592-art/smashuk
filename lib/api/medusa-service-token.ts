const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
let cachedToken: string | null = null;
let tokenExpiry = 0;
export async function getMedusaServiceToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  const email = process.env.MEDUSA_ADMIN_EMAIL;
  const password = process.env.MEDUSA_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD in .env.local');
  }
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Medusa service login failed: ${err.message ?? res.statusText}`);
  }
  const data = await res.json();
  if (!data.token) {
    throw new Error('No token in Medusa login response');
  }
  cachedToken = data.token;
  tokenExpiry = Date.now() + 55 * 60 * 1000;
  return cachedToken!;
}
export function invalidateMedusaServiceToken() {
  cachedToken = null;
  tokenExpiry = 0;
}
export async function medusaServiceFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let token = await getMedusaServiceToken();
  const doFetch = (t: string) => fetch(`${MEDUSA_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${t}`,
      'Content-Type': 'application/json'
    }
  });
  let res = await doFetch(token);
  if (res.status === 401) {
    invalidateMedusaServiceToken();
    token = await getMedusaServiceToken();
    res = await doFetch(token);
  }
  return res;
}
export { MEDUSA_URL };
