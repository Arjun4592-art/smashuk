// lib/api/google-shadow.ts
//
// SERVER-ONLY. Shared by [...nextauth]/route.ts and auth/me/route.ts.
//
// Google-logged-in customers don't have a real password, so we derive a
// deterministic "shadow" password from their email + NEXTAUTH_SECRET. Same
// input always produces the same output, so we never need to store it —
// both routes just recompute it and log in to Medusa's emailpass provider.
export async function deriveGoogleShadowPassword(
  email: string,
): Promise<string> {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error(
      'NEXTAUTH_SECRET is required to derive the Google shadow password',
    )
  }
  const data = new TextEncoder().encode(
    `google-shadow:${email.toLowerCase()}:${secret}`,
  )
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
