// app/api/pos/products/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Fetches POS products from Medusa.
// The Secret API Key doesn't work as a Bearer token in Medusa v2,
// so we get a JWT via email/password and cache it
// (shared helper — lib/api/medusa-service-token.ts).
//
// Added: description, images — POS terminal ab product ka image, price,
// description, and stock. (Previously description/images weren't
// requested, so the POS card looked empty.)
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { inferSellingChannel } from '@/lib/api/selling-channels-client'

async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET() {
  // SECURITY: exposes internal SKU + per-location inventory data — must
  // require a logged-in POS staff member or dashboard admin.
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // BUG FIX: this used to fetch every product regardless of `status`,
    // including drafts. The POS terminal would let a cashier add a draft
    // product to the cart, but Medusa's Store API (which /api/pos/orders
    // uses to actually create the order) only accepts variants belonging
    // to a *published* product — so checkout failed at the very last step
    // with "Variants ... do not exist or belong to a product that is not
    // published", after the cashier had already rung the whole sale up.
    // Filtering to status=published here means the POS never shows a
    // product it can't actually sell.
    const response = await medusaServiceFetch(
      '/admin/products?limit=200&status[]=published&fields=id,title,description,thumbnail,status,*categories,*images,*variants,*variants.prices,variants.sku,variants.id,*variants.inventory_items,*variants.inventory_items.inventory,*variants.inventory_items.inventory.location_levels,*sales_channels',
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error('[POS] Medusa API error:', response.status, errText)
      return NextResponse.json(
        { error: `Medusa error: ${response.status}`, details: errText },
        { status: response.status },
      )
    }

    const data = await response.json()
    const allProducts = data.products ?? []

    // Only show products the dashboard marked as "Store" or "Both" — a
    // product set to "Website"-only shouldn't be ring-up-able at the till.
    // Products with no recognizable channel (legacy/unassigned) fail open
    // and still show, so nothing already in the catalog disappears.
    const products = allProducts.filter(
      (p: any) => inferSellingChannel(p.sales_channels) !== 'website',
    )

    console.log(
      `[POS] ${products.length}/${allProducts.length} products visible (Store/Both channel)`,
    )
    return NextResponse.json({ products })
  } catch (err: any) {
    console.error('[POS] Products route error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 },
    )
  }
}
