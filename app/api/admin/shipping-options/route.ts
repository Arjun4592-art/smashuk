// app/api/admin/shipping-options/route.ts
//
// Real Medusa shipping options (v2 model: fulfillment set → service zone →
// shipping option → prices), NOT the /api/admin/shipping-settings JSON blob.
// That older route only ever fed the dashboard's own UI — it never created
// anything Medusa's checkout could actually charge or offer, which is why
// "Add rate" on the Shipping settings page looked like it worked but changed
// nothing for customers. This route is the one that does.
//
// GET  → all shipping options, grouped by their service zone, so the
//        dashboard can render "Zone → its rates" the same way Admin does.
// POST → creates one new shipping option (a "rate") on an existing service
//        zone + shipping profile, exactly like scripts/add-store-pickup-option.ts
//        and scripts/fix-products-shipping-profile.ts already do from the CLI.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

async function safeJson(res: Response) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 300) }
  }
}

export async function GET(req: NextRequest) {
  const authorization = (await getAdminAuthHeader(req)) ?? ''
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const fields =
      'id,name,price_type,service_zone_id,shipping_profile_id,provider_id,' +
      '*service_zone,*service_zone.fulfillment_set,*shipping_profile,*type,*prices,*rules'

    const [res, provRes] = await Promise.all([
      fetch(
        `${MEDUSA_URL}/admin/shipping-options?limit=200&fields=${encodeURIComponent(fields)}`,
        { headers: { Authorization: authorization } },
      ),
      fetch(`${MEDUSA_URL}/admin/fulfillment-providers`, {
        headers: { Authorization: authorization },
      }).catch(() => null),
    ])
    const data = await safeJson(res)
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? 'Failed to load shipping options' },
        { status: res.status },
      )
    }
    const provData = provRes ? await safeJson(provRes) : {}
    const providers: { id: string }[] = provData.fulfillment_providers ?? []
    const royalMailProviderId =
      providers.find((p) => /royal[-_ ]?mail/i.test(p.id))?.id ?? null

    // Friendly label for whatever provider a rate is actually wired to —
    // this is what makes a mis-wired rate (e.g. a delivery option silently
    // stuck on Manual instead of Royal Mail) visible in the dashboard UI
    // instead of only failing invisibly at fulfillment time.
    function providerLabel(providerId: string | null | undefined): string {
      if (!providerId) return 'Unknown'
      if (/royal[-_ ]?mail/i.test(providerId)) return 'Royal Mail Click & Drop'
      if (/manual/i.test(providerId)) return 'Manual (no live courier)'
      return providerId
    }

    const options: any[] = data.shipping_options ?? []

    // Group by service zone so the UI can render "Zone → rates" like
    // Medusa Admin's own Locations & Shipping page does.
    const zonesById = new Map<string, any>()
    for (const opt of options) {
      const zone = opt.service_zone
      if (!zone) continue
      if (!zonesById.has(zone.id)) {
        zonesById.set(zone.id, {
          id: zone.id,
          name: zone.name,
          fulfillment_set_name: zone.fulfillment_set?.name ?? null,
          fulfillment_set_type: zone.fulfillment_set?.type ?? null,
          geo_zones: zone.geo_zones ?? [],
          options: [] as any[],
        })
      }
      const gbpPrice = (opt.prices ?? []).find(
        (p: any) => p.currency_code === 'gbp',
      )
      // BUG FIX: is_pickup used to be guessed from the option's NAME
      // (/pickup|store|collect/i) — fragile, since renaming a rate or
      // adding an unrelated rate with "store" in the name would misflag
      // it. The real signal Medusa uses is the 'enabled_in_store' rule
      // (see scripts/add-store-pickup-option.ts), so read that directly.
      const isPickup = (opt.rules ?? []).some(
        (r: any) => r.attribute === 'enabled_in_store' && r.value === 'true',
      )
      zonesById.get(zone.id).options.push({
        id: opt.id,
        name: opt.name,
        price_type: opt.price_type,
        amount:
          opt.price_type === 'calculated' ? null : (gbpPrice?.amount ?? 0),
        hasPrice: !!gbpPrice,
        shipping_profile_id: opt.shipping_profile_id,
        shipping_profile_name: opt.shipping_profile?.name ?? null,
        provider_id: opt.provider_id,
        provider_label: providerLabel(opt.provider_id),
        // Flags a delivery (non-pickup) rate that isn't wired to Royal
        // Mail — the exact bug this whole fix addresses. Pickup rates are
        // correctly on Manual, so they're never flagged.
        provider_mismatch:
          !isPickup &&
          !!royalMailProviderId &&
          opt.provider_id !== royalMailProviderId,
        is_pickup: isPickup,
      })
    }

    return NextResponse.json({
      zones: Array.from(zonesById.values()),
      royal_mail_provider_id: royalMailProviderId,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const authorization = (await getAdminAuthHeader(req)) ?? ''
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      name,
      amount,
      service_zone_id,
      shipping_profile_id,
      provider_id,
      is_pickup,
    } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'A rate name is required' },
        { status: 400 },
      )
    }
    if (!service_zone_id) {
      return NextResponse.json(
        { error: 'A shipping zone is required' },
        { status: 400 },
      )
    }
    if (!shipping_profile_id) {
      return NextResponse.json(
        { error: 'A shipping profile is required' },
        { status: 400 },
      )
    }
    const priceAmount = Number(amount)
    if (Number.isNaN(priceAmount) || priceAmount < 0) {
      return NextResponse.json(
        { error: 'Price must be a number ≥ 0' },
        { status: 400 },
      )
    }

    // provider_id is required by Medusa. If the dashboard didn't send one
    // explicitly, resolve a sensible default based on the rate type instead
    // of blindly grabbing whichever provider Medusa happens to list first.
    //
    // BUG FIX: this used to do
    //   resolvedProviderId = provData.fulfillment_providers?.[0]?.id ?? 'manual_manual'
    // unconditionally — so every "Add rate" from the dashboard (there's no
    // provider picker in the UI) silently got whatever provider was first
    // in the list, almost always Medusa's built-in Manual provider. For a
    // real delivery rate (e.g. "Royal Mail") that's wrong: Manual never
    // calls out to Royal Mail's Click & Drop API, so nothing ever reaches
    // their dashboard even though the order shows "Fulfilled" here.
    // Pickup rates SHOULD stay on Manual (a human hands the item over —
    // there's nothing for a courier API to do), so that part is correct
    // and preserved below; only the non-pickup path is fixed.
    let resolvedProviderId = provider_id
    if (!resolvedProviderId) {
      const provRes = await fetch(`${MEDUSA_URL}/admin/fulfillment-providers`, {
        headers: { Authorization: authorization },
      })
      const provData = await safeJson(provRes)
      const providers: { id: string }[] = provData.fulfillment_providers ?? []

      if (is_pickup) {
        resolvedProviderId =
          providers.find((p) => /manual/i.test(p.id))?.id ?? 'manual_manual'
      } else {
        // Matches "royal-mail", "royal_mail", "royal mail", "royalmail" —
        // the real registered id is "fp_royal-mail_royal-mail" (hyphenated).
        const royalMail = providers.find((p) => /royal[-_ ]?mail/i.test(p.id))
        if (!royalMail) {
          return NextResponse.json(
            {
              error:
                'No Royal Mail fulfillment provider is registered on the backend yet, so a ' +
                "live courier rate can't be created automatically. Available providers: " +
                (providers.map((p) => p.id).join(', ') || 'none') +
                '. Pass provider_id explicitly if you meant to use a different one.',
            },
            { status: 422 },
          )
        }
        resolvedProviderId = royalMail.id
      }
    }

    const res = await fetch(`${MEDUSA_URL}/admin/shipping-options`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name.trim(),
        service_zone_id,
        shipping_profile_id,
        provider_id: resolvedProviderId,
        price_type: 'flat',
        type: {
          label: name.trim(),
          description: is_pickup
            ? `${name.trim()} — collect in-store`
            : `${name.trim()} shipping`,
          code: is_pickup
            ? 'store_pickup'
            : name
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')
                .slice(0, 40),
        },
        // BUG FIX: this route previously always sent `rules: []` (visible
        // everywhere), which is correct for real delivery rates but wrong
        // for pickup — pickup options need the 'enabled_in_store' rule
        // (see scripts/add-store-pickup-option.ts) or Medusa keeps them
        // Admin-only and the storefront cart can never find/price them.
        // is_pickup now lets the dashboard "Add rate" modal create BOTH
        // kinds correctly, so pickup no longer needs the CLI script.
        rules: is_pickup
          ? [{ operator: 'eq', attribute: 'enabled_in_store', value: 'true' }]
          : [],
        prices: [{ currency_code: 'gbp', amount: priceAmount, rules: [] }],
      }),
    })
    const data = await safeJson(res)
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? 'Failed to create shipping option' },
        { status: res.status },
      )
    }

    return NextResponse.json({ shipping_option: data.shipping_option })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
