// lib/medusa-server.ts
//
// SERVER-ONLY. Import this only from Server Components, Route Handlers,
// or Server Actions — never from a file that a client component also imports.

import 'server-only'
import Medusa from '@medusajs/js-sdk'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES, type Surface } from '@/lib/api/auth-cookie'
import { getBackendUrl } from './medusa'

// ── Static admin client — only for trusted server-to-server jobs ─────────────
// (scheduled jobs, webhooks) where there is no logged-in human to scope to.
// Do NOT use this to serve a dashboard user's requests — use
// getServerAdminClient() below so Medusa's per-user permission checks apply.
export const medusaAdmin = new Medusa({
  baseUrl: getBackendUrl(),
  apiKey: process.env.MEDUSA_ADMIN_API_KEY ?? '',
  debug: process.env.NODE_ENV === 'development',
})

/**
 * Returns a Medusa client authenticated as the *currently logged-in* user
 * for the given surface, by reading their token out of the HttpOnly cookie.
 * Throws if there is no valid session — callers should catch and redirect/401.
 */
export async function getServerAdminClient(surface: Surface = 'dashboard') {
  const cookieStore = await cookies()
  const { tokenCookie } = SURFACE_COOKIES[surface]
  const token = cookieStore.get(tokenCookie)?.value

  if (!token) {
    throw new Error('UNAUTHENTICATED')
  }

  return new Medusa({
    baseUrl: getBackendUrl(),
    debug: process.env.NODE_ENV === 'development',
    globalHeaders: { Authorization: `Bearer ${token}` },
  })
}
