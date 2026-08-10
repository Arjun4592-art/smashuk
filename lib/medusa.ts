// lib/medusa.ts
//
// CLIENT-SAFE. Do not add 'server-only' or 'next/headers' imports here —
// this file is imported from client components (e.g. the customer login page).
// Server-only admin helpers live in lib/medusa-server.ts.

import Medusa from '@medusajs/js-sdk'

const getBackendUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'NEXT_PUBLIC_MEDUSA_BACKEND_URL is not set! Set it in your production environment.',
      )
    }
    return 'http://localhost:9000'
  }
  return url
}

// ── Store client (customers) — safe to import client-side ────────────────────
// NOTE: auth type is 'jwt', not 'session'. This app manages its own HttpOnly
// cookies per-surface (see lib/api/auth-cookie.ts) and extracts the raw JWT
// string returned by sdk.auth.login()/register() manually. 'session' mode
// relies on the SDK's own cookie jar, which doesn't reliably persist across
// separate Next.js server requests (e.g. NextAuth callbacks) — that mismatch
// was silently breaking Google OAuth customer linking.
export const medusaStore = new Medusa({
  baseUrl: getBackendUrl(),
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? '',
  debug: process.env.NODE_ENV === 'development',
  auth: { type: 'jwt' },
})

export { getBackendUrl }
