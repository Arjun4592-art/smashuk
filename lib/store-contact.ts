// lib/store-contact.ts
//
// SERVER-ONLY. Fetches the store's real name/email/phone/address from
// Medusa (the same `store.metadata` fields the dashboard's General Settings
// page reads and writes via /api/admin/general-settings) so public-facing
// pages like the Footer show whatever the store owner actually configured,
// instead of a hardcoded placeholder.
//
// Falls back to UK-appropriate defaults if the store hasn't set these yet,
// so the footer never shows blank fields or the old fake India address.

import 'server-only'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { CONTACT_EMAIL, CONTACT_PHONE, SITE_NAME } from '@/lib/constants'

export interface PublicStoreContact {
  name: string
  email: string
  phone: string
  address: {
    line1: string
    line2: string
    city: string
    state: string
    pincode: string
    country: string
  }
}

const FALLBACK: PublicStoreContact = {
  name: SITE_NAME,
  email: CONTACT_EMAIL,
  phone: CONTACT_PHONE,
  address: {
    line1: '42 Racket Court',
    line2: '',
    city: 'London',
    state: 'Greater London',
    pincode: 'SW1A 1AA',
    country: 'United Kingdom',
  },
}

// Cache for a few minutes — this is called on every Footer render (every
// page), and store contact details change rarely.
let cached: PublicStoreContact | null = null
let cachedAt = 0
const CACHE_MS = 5 * 60 * 1000

export async function getPublicStoreContact(): Promise<PublicStoreContact> {
  if (cached && Date.now() - cachedAt < CACHE_MS) {
    return cached
  }

  try {
    const res = await medusaServiceFetch(
      '/admin/stores?limit=1&fields=id,name,metadata',
    )
    if (!res.ok) throw new Error(`Medusa stores error: ${res.status}`)

    const { stores } = await res.json()
    const store = stores?.[0]
    if (!store) throw new Error('No store found')

    const meta = store.metadata ?? {}

    const result: PublicStoreContact = {
      name: store.name || FALLBACK.name,
      email: meta.email || FALLBACK.email,
      phone: meta.phone || FALLBACK.phone,
      address: {
        line1: meta.address_line1 || FALLBACK.address.line1,
        line2: meta.address_line2 || FALLBACK.address.line2,
        city: meta.address_city || FALLBACK.address.city,
        state: meta.address_state || FALLBACK.address.state,
        pincode: meta.address_pincode || FALLBACK.address.pincode,
        country: meta.address_country || FALLBACK.address.country,
      },
    }

    cached = result
    cachedAt = Date.now()
    return result
  } catch (err) {
    console.error('[store-contact] Falling back to defaults:', err)
    // Don't cache the failure — retry on the next request instead of being
    // stuck on fallback data for CACHE_MS if it was just a transient error.
    return FALLBACK
  }
}
