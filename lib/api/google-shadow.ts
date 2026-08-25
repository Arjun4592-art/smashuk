export async function deriveGoogleShadowPassword(email: string): Promise<string> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is required to derive the Google shadow password');
  }
  const data = new TextEncoder().encode(`google-shadow:${email.toLowerCase()}:${secret}`);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
