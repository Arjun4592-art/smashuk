// app/api/admin/services/seed-stringing/route.ts
//
// One-click setup: creates the 3 bookable stringing-service products
// (Badminton / Tennis / Squash) in Medusa so the public booking form at
// /local-store/stringing has real, purchasable variants to add to cart.
// Idempotent — safe to click more than once, existing services are skipped.
//
// Delegates the actual product creation to POST /api/admin/products (same
// origin) instead of re-implementing it, so these services automatically
// get the same sales-channel + shipping-profile auto-attach fixes that
// route already has — no separate bug surface to maintain here.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

const SERVICES = [
  {
    sport: 'badminton',
    title: 'Badminton Racket Stringing',
    price: 1600, // pence — £16.00
    description:
      'Professional badminton racket stringing at our Manchester store. Standard 24-hour turnaround, with a 40-minute express slot bookable in-store. Choose your string and tension when you book.',
  },
  {
    sport: 'tennis',
    title: 'Tennis Racket Stringing',
    price: 2200, // £22.00
    description:
      'Professional tennis racket stringing at our Manchester store. Standard 24-hour turnaround, with a 40-minute express slot bookable in-store. Choose your string and tension when you book.',
  },
  {
    sport: 'squash',
    title: 'Squash Racket Stringing',
    price: 2200, // £22.00
    description:
      'Professional squash racket stringing at our Manchester store. Standard 24-hour turnaround, with a 40-minute express slot bookable in-store. Choose your string and tension when you book.',
  },
]

export async function POST(req: NextRequest) {
  const authorization = (await getAdminAuthHeader(req)) ?? ''
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find which of the 3 already exist so re-running this is a no-op for them.
    const existingRes = await fetch(
      `${MEDUSA_URL}/admin/products?q=Stringing&limit=50&fields=id,metadata`,
      { headers: { Authorization: authorization } },
    )
    const existingData = await existingRes.json()
    const existingSports = new Set(
      (existingData.products ?? [])
        .filter((p: any) => p.metadata?.service_type === 'stringing')
        .map((p: any) => p.metadata?.service_sport),
    )

    const cookie = req.headers.get('cookie') ?? ''
    const created: string[] = []
    const skipped: string[] = []

    for (const s of SERVICES) {
      if (existingSports.has(s.sport)) {
        skipped.push(s.title)
        continue
      }

      const productBody = {
        title: s.title,
        description: s.description,
        metadata: { service_type: 'stringing', service_sport: s.sport },
        options: [{ title: 'Turnaround', values: ['Standard (24h)'] }],
        variants: [
          {
            title: 'Standard (24h)',
            manage_inventory: false, // it's a service, not stock
            options: { Turnaround: 'Standard (24h)' },
            prices: [{ currency_code: 'gbp', amount: s.price }],
          },
        ],
      }

      const res = await fetch(`${req.nextUrl.origin}/api/admin/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify(productBody),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return NextResponse.json(
          {
            error: `Failed creating "${s.title}": ${err.error ?? res.status}`,
            created,
            skipped,
          },
          { status: 500 },
        )
      }
      created.push(s.title)
    }

    return NextResponse.json({ created, skipped })
  } catch (err: any) {
    console.error('[seed-stringing] error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Failed to set up stringing services' },
      { status: 500 },
    )
  }
}

// GET — just reports current status, used by the settings page to show
// "Already set up" vs "Not set up yet" without creating anything.
export async function GET(req: NextRequest) {
  const authorization = (await getAdminAuthHeader(req)) ?? ''
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await fetch(
    `${MEDUSA_URL}/admin/products?q=Stringing&limit=50&fields=id,title,metadata,status`,
    { headers: { Authorization: authorization } },
  )
  const data = await res.json()
  const services = (data.products ?? []).filter(
    (p: any) => p.metadata?.service_type === 'stringing',
  )
  return NextResponse.json({ services })
}
