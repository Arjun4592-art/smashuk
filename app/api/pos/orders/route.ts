// app/api/pos/orders/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Creates a POS order — using the CORRECT Medusa v2 pattern.
//
// SECURITY FIX: this used to call "POST /admin/orders", which doesn't exist
// at all in Medusa v2 (there is no direct order-create admin endpoint in
// v2) — so every checkout showed "Order create failed" and was silently
// ignored (a receipt printed at the counter, but the order/stock was never
// actually recorded in Medusa).
//
// This now uses the same flow any real Medusa storefront checkout
// uses (cart → line-items → payment-collection → payment-session
// → complete). This is version-safe — it doesn't depend on the optional
// draft-order plugin.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { getRemainingReturnableQty } from '@/lib/api/medusa-returns'
import { fulfillOrder } from '@/lib/api/medusa-fulfillment'
import { requireStripe } from '@/lib/stripe-server'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}

// ── GET — POS order history, read straight from Medusa ────────────────────
//
// WHY THIS EXISTS: the POS "Orders" page (app/pos/terminal/orders/page.tsx)
// used to render ONLY `completedOrders` from the local zustand store, which
// is persisted to the browser's localStorage (persist key
// 'smashpro-pos-store'). Every sale IS already created as a real Medusa
// order via the POST handler below (medusaOrderId is saved) — but the
// history LIST itself never talked to Medusa, so clearing the browser,
// switching devices, or a fresh install lost the visible order history
// even though the real orders were sitting safely in Medusa the whole
// time. This route is the fix: it fetches the real orders back out of
// Medusa (filtered to this store's POS sales) so the list is no longer
// tied to one browser's storage.
//
// Note: `/api/admin/orders` already does something similar for the
// dashboard, but middleware.ts deliberately blocks POS-only sessions from
// the broad /api/admin/* surface (see middleware.ts POS_STAFF_ALLOWED_PATHS)
// — so this route uses the same service-token pattern as the sibling
// lookup route instead, scoped to what a POS session is allowed to see.
function toPosOrderRecord(o: any) {
  const items = (o.items ?? []).map((i: any) => ({
    product: {
      id: i.variant_id ?? i.id,
      // Real Medusa order LINE ITEM id (distinct from the variant id
      // above) — this is what returns/refunds must key off, since
      // that's what /admin/orders/:id's `items[].id` actually is.
      lineItemId: i.id as string,
      name: i.product_title ?? i.title ?? 'Item',
      brand: i.metadata?.brand ?? '',
      price: i.unit_price ?? 0,
    },
    quantity: i.quantity ?? 1,
  }))

  const customerName =
    (o.customer
      ? `${o.customer.first_name ?? ''} ${o.customer.last_name ?? ''}`.trim()
      : '') ||
    o.metadata?.customer_name ||
    ''
  const customerPhone =
    o.metadata?.customer_phone || o.shipping_address?.phone || ''

  return {
    // Real Medusa order id — used for return/detail lookups.
    medusaOrderId: o.id as string,
    // Human-facing id shown in the list, matching the dashboard's format.
    id: o.display_id ? `SR-${o.display_id}` : (o.id as string),
    items,
    customer: customerName
      ? { name: customerName, phone: customerPhone }
      : null,
    subtotal: o.subtotal ?? 0,
    discountTotal: o.discount_total ?? 0,
    tax: o.tax_total ?? 0,
    total: o.total ?? 0,
    paymentMethod: o.metadata?.payment_method || 'cash',
    note: o.metadata?.note || '',
    cashier: o.metadata?.cashier || '',
    completedAt: o.created_at,
    // Lets the list badge "🏬 Pickup" and show an "Awaiting pickup" status
    // for website Store Pickup orders that show up here unassigned to any
    // cashier — same flag the dashboard and OrderLookupModal already use.
    isPickup: o.metadata?.fulfillment_type === 'pickup',
    fulfillmentStatus: o.fulfillment_status ?? 'not_fulfilled',
    // Legacy flag OR nothing left returnable across every line item.
    returned:
      Boolean(o.metadata?.returned) ||
      (Array.isArray(o.items) &&
        o.items.length > 0 &&
        Object.values(getRemainingReturnableQty(o)).every((qty) => qty <= 0)),
  }
}

export async function GET(req: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? 150), 300)

  const fields =
    'id,display_id,email,subtotal,discount_total,tax_total,total,status,' +
    'fulfillment_status,payment_status,created_at,*items,*customer,' +
    '*shipping_address,+metadata'

  try {
    const res = await medusaServiceFetch(
      `/admin/orders?limit=${limit}&order=-created_at&fields=${encodeURIComponent(fields)}`,
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: err.message ?? 'Failed to load orders' },
        { status: res.status },
      )
    }
    const data = await res.json()
    // Show every order — POS-rung sales AND every website order (shipped
    // or pickup) — so staff can see and look up online sales from the POS
    // too, not just ones awaiting in-store collection.
    const orders = (data.orders ?? []).map(toPosOrderRecord)
    return NextResponse.json({ orders })
  } catch (err: any) {
    console.error('[API] POS orders GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function storeFetch(path: string, init: RequestInit = {}) {
  return fetch(`${MEDUSA_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      'Content-Type': 'application/json',
      'x-publishable-api-key': PUBLISHABLE_KEY,
    },
  })
}

async function safeJson(res: Response, label: string) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    console.error(
      `[POS orders] ${label} non-JSON (${res.status}):`,
      text.slice(0, 300),
    )
    throw new Error(
      `${label} failed (${res.status}): ${text.slice(0, 200) || 'empty response'}`,
    )
  }
}

// Builds a clear, step-labeled message from a Medusa error response instead
// of letting a bare "An unknown error occurred" (Medusa's own generic
// fallback text for unclassified internal errors) reach the cashier with no
// indication of which of the 5 steps (cart/line-items/shipping/payment/
// complete) actually failed.
function stepError(label: string, status: number, data: any): string {
  const raw =
    data?.message ??
    data?.error?.message ??
    data?.error ??
    JSON.stringify(data).slice(0, 200)
  return `[${label}] (HTTP ${status}) ${raw}`
}

export async function POST(request: NextRequest) {
  // SECURITY: this route completes a real cart/order using the store's own
  // publishable key + service credentials — must only be reachable by a
  // logged-in POS staff member or dashboard admin.
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!PUBLISHABLE_KEY) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is missing in .env.local' },
      { status: 500 },
    )
  }

  try {
    const body = await request.json()
    const {
      items,
      region_id,
      customer_id,
      customer_email,
      customer_name,
      customer_phone,
      payment_method,
      note,
      cashier,
      stripe_payment_intent_id,
      stripe_payment_amount,
      fulfillment_type,
      shipping_address,
      gift_card_code,
    } = body
    // Buy-in-store, ship-to-customer: 'pickup' (default, unchanged
    // behaviour — customer takes items now) or 'ship' (deliver to an
    // address, like a normal online order but rung up in person).
    const fulfillmentType: 'pickup' | 'ship' =
      fulfillment_type === 'ship' ? 'ship' : 'pickup'

    if (fulfillmentType === 'ship') {
      const required = [
        'first_name',
        'address_1',
        'city',
        'postal_code',
        'country_code',
      ]
      const missing = required.filter((k) => !shipping_address?.[k])
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Shipping address missing: ${missing.join(', ')}` },
          { status: 400 },
        )
      }
    }

    if (!region_id) {
      return NextResponse.json(
        { error: 'region_id is required' },
        { status: 400 },
      )
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 },
      )
    }

    // ── Resolve the cart's email so the order actually attaches to the
    // right customer ──────────────────────────────────────────────────────
    // BUG FIX ("selected customer shows up as walk-in"): Medusa v2's
    // /store/carts endpoint REJECTS a `customer_id` field outright
    // ("Unrecognized key(s) in object: 'customer_id'") — it can only ever
    // link a cart to a customer by matching the cart's `email` against an
    // existing Customer record. The old code passed `customer_id` in a
    // *separate* admin call AFTER the order was already placed
    // (POST /admin/orders/:id), which Medusa v2 does not support either —
    // v2 requires a customer-approved "transfer ownership" request to
    // reassign an existing order's customer, so that call was silently
    // failing every time and the order kept whatever email the cart was
    // created with.
    //
    // The customer picked in Customer Search often has no email on file
    // (only a phone number was saved) — so the cart silently fell back to
    // the shared 'walkin@smashuk.co.uk' address, which is exactly why it
    // showed up as "walk-in" instead of them.
    //
    // Fix: look the customer's real email up first and use THAT as the
    // cart's email — Medusa auto-links carts to the matching customer
    // record by email. If they truly have no email on file, mint a
    // deterministic per-customer address and save it onto their record so
    // every future POS sale for them keeps matching the same customer
    // instead of falling back to the generic walk-in bucket.
    // BUG FIX ROUND 2 ("selected the real customer, order still landed
    // on the pos-cus_... duplicate"): lowercasing on its own isn't
    // enough when a STALE duplicate from before this fix already owns
    // that exact lowercase email (e.g. cus_A's real email is
    // "...@..." (uppercase), lowercasing it produces a string that
    // cus_B — an old leftover duplicate — already has on file). Cart
    // create's auto-link-by-email then attaches the sale to whichever
    // customer already owns that email, which is the WRONG one.
    //
    // Guard against this: before trusting a candidate email, check
    // whether any *other* customer already owns it. If so, mint a
    // guaranteed-unique variant for this customer instead of reusing
    // the colliding one, and persist it so this customer keeps a
    // stable, unambiguous email of their own going forward.
    async function resolveUniqueEmail(
      candidate: string,
      ownerId: string,
    ): Promise<string> {
      try {
        const checkRes = await medusaServiceFetch(
          `/admin/customers?email=${encodeURIComponent(candidate)}&limit=1`,
        )
        if (checkRes.ok) {
          const checkData = await safeJson(checkRes, 'email collision check')
          const owner = checkData?.customers?.[0]
          if (owner && owner.id !== ownerId) {
            // Someone else already owns this exact email — don't reuse
            // it. Mint a distinct, unmistakably-this-customer variant.
            const unique = candidate.replace('@', `-${ownerId.slice(-8)}@`)
            const setRes = await medusaServiceFetch(
              `/admin/customers/${ownerId}`,
              {
                method: 'POST',
                body: JSON.stringify({ email: unique }),
              },
            )
            if (!setRes.ok) {
              console.warn(
                '[POS orders] could not persist de-duplicated email onto customer',
                ownerId,
              )
            }
            return unique
          }
        }
      } catch (checkErr) {
        console.warn(
          '[POS orders] email collision check failed (non-fatal):',
          checkErr,
        )
      }
      return candidate
    }

    let cartEmail = customer_email as string | undefined

    if (
      !cartEmail &&
      customer_id &&
      !String(customer_id).startsWith('local-')
    ) {
      try {
        const custRes = await medusaServiceFetch(
          `/admin/customers/${customer_id}`,
        )
        if (custRes.ok) {
          const custData = await safeJson(custRes, 'customer lookup')
          cartEmail = custData?.customer?.email || undefined
        }
      } catch (lookupErr) {
        console.warn('[POS orders] customer email lookup failed:', lookupErr)
      }

      if (!cartEmail) {
        // BUG FIX ("customer #3 select karne pe #4 ka data" — duplicate
        // customer records): Medusa's /store/carts endpoint silently
        // lowercases the cart's email before it tries to auto-link the
        // cart to a matching Customer by email. Medusa's own ULID
        // customer_id (e.g. "cus_01KXC5F54XAZHN2TZSMNFPYTGH") is
        // uppercase — so a synthetic email minted straight from it and
        // saved on the customer record was ALSO uppercase. On the next
        // sale, the cart's (lowercased) email no longer exactly matched
        // that uppercase email on file, the "link by email" step failed,
        // and Medusa auto-created a brand new guest customer with the
        // lowercase email instead — a silent duplicate that then
        // accumulated its own separate order history.
        //
        // Fix: always lowercase the synthetic email before minting AND
        // before persisting it, so it matches whatever case the cart
        // create step normalizes to, every time.
        cartEmail = await resolveUniqueEmail(
          `pos-${customer_id}@smashuk.co.uk`.toLowerCase(),
          customer_id,
        )
        try {
          const setEmailRes = await medusaServiceFetch(
            `/admin/customers/${customer_id}`,
            {
              method: 'POST',
              body: JSON.stringify({ email: cartEmail }),
            },
          )
          if (!setEmailRes.ok) {
            console.warn(
              '[POS orders] could not persist synthetic email onto customer',
              customer_id,
            )
          }
        } catch (setEmailErr) {
          console.warn('[POS orders] set customer email threw:', setEmailErr)
        }
      } else {
        // Even a real email on file could have been saved with mixed
        // case (e.g. typed at the counter) — normalize it the same way
        // the cart will, so linking is consistent either way. Also
        // guard against this normalized form already belonging to a
        // different (stray/duplicate) customer.
        cartEmail = await resolveUniqueEmail(
          cartEmail.toLowerCase(),
          customer_id,
        )
      }
    }

    if (!cartEmail) {
      cartEmail = (customer_email || 'walkin@smashuk.co.uk').toLowerCase()
    }

    // 1) Create the cart
    const cartRes = await storeFetch('/store/carts', {
      method: 'POST',
      body: JSON.stringify({
        region_id,
        email: cartEmail,
      }),
    })
    const cartData = await safeJson(cartRes, 'cart create')
    if (!cartRes.ok) {
      console.error(
        '[POS orders] cart create failed:',
        cartRes.status,
        cartData,
      )
      return NextResponse.json(
        { error: stepError('cart create', cartRes.status, cartData) },
        { status: cartRes.status },
      )
    }
    const cartId = cartData.cart.id

    // 2) Add items
    for (const item of items) {
      const lineRes = await storeFetch(`/store/carts/${cartId}/line-items`, {
        method: 'POST',
        body: JSON.stringify({
          variant_id: item.variant_id,
          quantity: item.quantity,
        }),
      })
      if (!lineRes.ok) {
        const lineData = await safeJson(lineRes, 'add line item')
        console.error(
          '[POS orders] add line item failed:',
          item.variant_id,
          lineRes.status,
          lineData,
        )
        return NextResponse.json(
          {
            error: stepError(
              `add item ${item.variant_id}`,
              lineRes.status,
              lineData,
            ),
          },
          { status: lineRes.status },
        )
      }
    }

    // 2b) Gift card — same /store/carts/:id/gift-cards endpoint the website
    // checkout uses (see app/api/store/cart/gift-cards/route.ts). This must
    // happen BEFORE the payment collection/session below: it nets the
    // card's credit_lines against the cart's own total server-side, so
    // every total read after this point (the card-verification check
    // further down, and the order's final total) already reflects the
    // gift card deduction — nothing here is computed or trusted from the
    // client's own math.
    let giftCardApplied = false
    if (gift_card_code) {
      const gcRes = await storeFetch(`/store/carts/${cartId}/gift-cards`, {
        method: 'POST',
        body: JSON.stringify({ code: String(gift_card_code).toUpperCase() }),
      })
      if (!gcRes.ok) {
        const gcData = await safeJson(gcRes, 'gift card apply')
        console.error(
          '[POS orders] gift card apply failed:',
          gcRes.status,
          gcData,
        )
        return NextResponse.json(
          {
            error: stepError('gift card', gcRes.status, gcData),
          },
          { status: gcRes.status },
        )
      }
      giftCardApplied = true
    }

    // 3) Shipping address (ship-to-customer only) + shipping method.
    //    - pickup (default, unchanged): find a pickup-like option, or fall
    //      back to the first available one — the customer already has the
    //      items in hand at the counter.
    //    - ship: attach the address the cashier collected, then pick the
    //      first REAL (non-pickup) shipping option — the store's normal
    //      courier method (e.g. Royal Mail) — so the order actually gets
    //      fulfilled/shipped like a website order would be.
    if (fulfillmentType === 'ship' && shipping_address) {
      const addrRes = await storeFetch(`/store/carts/${cartId}`, {
        method: 'POST',
        body: JSON.stringify({ shipping_address }),
      })
      if (!addrRes.ok) {
        const addrData = await safeJson(addrRes, 'shipping address add')
        console.error(
          '[POS orders] shipping address add failed:',
          addrRes.status,
          addrData,
        )
        return NextResponse.json(
          { error: stepError('shipping address', addrRes.status, addrData) },
          { status: addrRes.status },
        )
      }
    }

    const shippingOptsRes = await storeFetch(
      `/store/shipping-options?cart_id=${cartId}`,
    )
    if (shippingOptsRes.ok) {
      const shippingOptsData = await safeJson(
        shippingOptsRes,
        'shipping options fetch',
      )
      const options = shippingOptsData.shipping_options ?? []

      const chosen =
        fulfillmentType === 'ship'
          ? (options.find(
              (o: any) => !/pickup|store|pos/i.test(o.name ?? ''),
            ) ?? options[0])
          : (options.find((o: any) => /pickup|store|pos/i.test(o.name ?? '')) ??
            options[0])

      if (chosen) {
        const smRes = await storeFetch(
          `/store/carts/${cartId}/shipping-methods`,
          {
            method: 'POST',
            body: JSON.stringify({ option_id: chosen.id }),
          },
        )
        if (!smRes.ok) {
          const smData = await safeJson(smRes, 'shipping method add')
          console.warn('[POS orders] shipping method add failed:', smData)
          // Non-fatal — some regions/carts don't require it, try to continue.
        }
      } else if (fulfillmentType === 'ship') {
        // No real shipping option configured at all — this would otherwise
        // silently fall through with no delivery method on a paid shipping
        // order, so fail loudly instead of quietly mis-fulfilling it.
        return NextResponse.json(
          {
            error:
              'No shipping option is configured in Medusa for this region.',
          },
          { status: 400 },
        )
      }
    }

    // ── Verify the card payment actually happened, for the amount claimed ──
    //
    // Everything above (cart total, line item prices) is computed by Medusa
    // itself from real product/variant prices — a client can't fake that.
    // But until now, nothing checked that the Stripe card-present payment
    // referenced by `stripe_payment_intent_id` actually succeeded, or that
    // it was for the right amount, before the order got created and
    // auto-captured as paid below. That meant a failed/never-attempted
    // card charge — or a stale/unrelated PaymentIntent id — could still
    // result in a "paid" order and the customer walking out with the item.
    //
    // We fetch the cart's own Medusa-computed total (not anything the
    // client sent) and cross-check it against Stripe's own record of what
    // that PaymentIntent actually charged (also not anything the client
    // sent) — the only things trusted here are Medusa and Stripe themselves.
    const involvesCardPayment =
      payment_method === 'card' || payment_method === 'split'
    if (involvesCardPayment && stripe_payment_intent_id) {
      const cartCheckRes = await storeFetch(`/store/carts/${cartId}`)
      const cartCheckData = await safeJson(cartCheckRes, 'cart total check')
      const cartTotal = Math.round(cartCheckData?.cart?.total ?? 0)

      try {
        const stripeClient = requireStripe()
        const intent = await stripeClient.paymentIntents.retrieve(
          stripe_payment_intent_id,
        )

        if (intent.status !== 'succeeded') {
          return NextResponse.json(
            {
              error: `Card payment was not completed (Stripe status: ${intent.status}). Sale not recorded — no money was taken.`,
            },
            { status: 402 },
          )
        }

        const verifiedAmount = intent.amount_received ?? intent.amount
        const claimedAmount = Math.round(stripe_payment_amount ?? 0)

        // The claimed amount must match what Stripe actually confirms it
        // charged — this is what stops a stale/reused/fabricated
        // PaymentIntent id from being accepted for more than it really covers.
        if (Math.abs(verifiedAmount - claimedAmount) > 1) {
          return NextResponse.json(
            {
              error:
                'Card payment amount could not be verified. Sale not recorded.',
            },
            { status: 402 },
          )
        }

        // For a full card payment, the verified charge must cover the
        // whole (Medusa-computed) order total — not just whatever the
        // client claimed it was for.
        if (payment_method === 'card' && verifiedAmount + 1 < cartTotal) {
          return NextResponse.json(
            {
              error: `Card payment (${verifiedAmount}) does not cover the order total (${cartTotal}). Sale not recorded.`,
            },
            { status: 402 },
          )
        }

        // Split: the card portion alone should never exceed the whole
        // order — the remainder is trusted as cash, same as any till.
        if (payment_method === 'split' && verifiedAmount > cartTotal + 1) {
          return NextResponse.json(
            {
              error: 'Card portion exceeds the order total. Sale not recorded.',
            },
            { status: 402 },
          )
        }
      } catch (stripeErr: any) {
        console.error(
          '[POS orders] Stripe payment verification failed:',
          stripeErr,
        )
        return NextResponse.json(
          {
            error: `Could not verify card payment with Stripe: ${stripeErr.message}`,
          },
          { status: 402 },
        )
      }
    } else if (payment_method === 'card') {
      // 'card' claimed but no PaymentIntent id at all — nothing to verify
      // against, so don't treat this as paid.
      return NextResponse.json(
        {
          error:
            'No verified card payment found for this sale. Sale not recorded.',
        },
        { status: 402 },
      )
    }

    // 4) Payment collection + payment session (system/manual provider —
    // real payment already happened at the counter, Medusa's system
    // provider just marks it captured without a 3rd-party processor)
    const pcRes = await storeFetch('/store/payment-collections', {
      method: 'POST',
      body: JSON.stringify({ cart_id: cartId }),
    })
    const pcData = await safeJson(pcRes, 'payment collection create')
    if (!pcRes.ok) {
      console.error(
        '[POS orders] payment collection create failed:',
        pcRes.status,
        pcData,
      )
      return NextResponse.json(
        { error: stepError('payment collection', pcRes.status, pcData) },
        { status: pcRes.status },
      )
    }
    const paymentCollectionId = pcData.payment_collection.id

    const psRes = await storeFetch(
      `/store/payment-collections/${paymentCollectionId}/payment-sessions`,
      {
        method: 'POST',
        body: JSON.stringify({ provider_id: 'pp_system_default' }),
      },
    )
    const psData = await safeJson(psRes, 'payment session create')
    if (!psRes.ok) {
      console.error(
        '[POS orders] payment session create failed:',
        psRes.status,
        psData,
      )
      return NextResponse.json(
        {
          error:
            stepError('payment session', psRes.status, psData) +
            ' — check that a payment provider (e.g. "System default") is enabled for this region in Medusa → Settings → Regions.',
        },
        { status: psRes.status },
      )
    }

    // 5) Complete the cart — this creates the actual Order
    const completeRes = await storeFetch(`/store/carts/${cartId}/complete`, {
      method: 'POST',
    })
    const completeData = await safeJson(completeRes, 'cart complete')

    if (!completeRes.ok || completeData.type === 'cart') {
      console.error(
        '[POS orders] cart complete failed:',
        completeRes.status,
        completeData,
      )
      return NextResponse.json(
        {
          error: stepError(
            'complete order',
            completeRes.ok ? 400 : completeRes.status,
            completeData.error ?? completeData,
          ),
        },
        { status: completeRes.ok ? 400 : completeRes.status },
      )
    }

    const order = completeData.order

    // 6) Attach POS-specific metadata (cashier, payment method, note), and
    // link the existing Medusa customer to the order if one was picked in
    // Customer Search — the Store API cart we created above is a walk-in
    // guest cart, so the only way to attribute the order to a real Medusa
    // customer record afterwards is this admin update.
    // This can't be set via the Store API — update it via the admin API.
    // Medusa v2 order update is POST, not PATCH.
    //
    // BUG FIX: customer_id and metadata used to be sent together in ONE
    // request, and the response status was never checked (only network
    // failures were caught). Medusa v2's order-update endpoint can reject
    // `customer_id` reassignment on an already-placed order — when that
    // happened the WHOLE request failed with a 400, and since it was one
    // bundled call, `metadata` (source: 'pos', cashier, payment_method...)
    // silently never got saved either. That's why orders where an existing
    // customer was attached in Customer Search kept showing up as
    // "Website" in the dashboard (source falls back to 'website' when
    // metadata.source is missing) and never counted toward that cashier's
    // sales total. Splitting these into two independent calls means a
    // customer_id failure can no longer take the metadata down with it.
    const metadataPayload = {
      source: 'pos',
      cashier: cashier ?? '',
      customer_name: customer_name ?? '',
      customer_phone: customer_phone ?? '',
      payment_method: payment_method ?? '',
      note: note ?? '',
      stripe_payment_intent_id: stripe_payment_intent_id ?? '',
      fulfillment_type: fulfillmentType,
      ...(giftCardApplied
        ? { gift_card_code: String(gift_card_code).toUpperCase() }
        : {}),
      ...(fulfillmentType === 'ship' && shipping_address
        ? {
            shipping_address_summary: [
              shipping_address.address_1,
              shipping_address.city,
              shipping_address.postal_code,
            ]
              .filter(Boolean)
              .join(', '),
          }
        : {}),
    }

    try {
      const metaRes = await medusaServiceFetch(`/admin/orders/${order.id}`, {
        method: 'POST',
        body: JSON.stringify({ metadata: metadataPayload }),
      })
      if (!metaRes.ok) {
        const metaErrData = await safeJson(metaRes, 'metadata attach').catch(
          () => null,
        )
        console.error(
          '[POS orders] metadata attach FAILED (order still created, but source/cashier will be wrong):',
          metaRes.status,
          metaErrData,
        )
      }
    } catch (metaErr) {
      console.error('[POS orders] metadata attach threw:', metaErr)
    }

    // customer_id no longer needs a separate post-hoc attach — the cart was
    // already created with the customer's real (or synthetic) email above,
    // so Medusa linked it to the right customer record automatically when
    // the order was placed. This best-effort call is kept only as a no-op
    // safety net for older Medusa versions that do support direct
    // reassignment; failures here are expected and harmless on v2.
    if (customer_id && !String(customer_id).startsWith('local-')) {
      try {
        const custRes = await medusaServiceFetch(`/admin/orders/${order.id}`, {
          method: 'POST',
          body: JSON.stringify({ customer_id }),
        })
        if (!custRes.ok) {
          console.warn(
            '[POS orders] direct customer_id reassign not supported on this Medusa version (expected on v2) — order is already linked correctly via cart email.',
          )
        }
      } catch (custErr) {
        console.warn(
          '[POS orders] customer_id attach threw (non-fatal):',
          custErr,
        )
      }
    }

    // BUG FIX: money for a POS sale is always collected at the counter
    // ("Take Now") — whether that's cash, card, or COD rung up in person —
    // so the payment should show as Captured immediately, not sit as
    // "Authorized" waiting for someone to manually hit Capture Payment in
    // the dashboard. This applies to BOTH pickup and ship-to-customer POS
    // sales: the cashier has already taken the money either way. What
    // differs between the two is fulfillment (below), not payment.
    let captured = false
    try {
      const orderRes = await medusaServiceFetch(
        `/admin/orders/${order.id}?fields=id,*payment_collections.payments`,
      )
      const orderData = await safeJson(orderRes, 'order fetch for capture')
      const payments = (orderData?.order?.payment_collections ?? []).flatMap(
        (pc: any) => pc.payments ?? [],
      )
      const uncaptured = payments.filter(
        (p: any) => !p.captured_at && p.status !== 'canceled',
      )
      for (const payment of uncaptured) {
        const capRes = await medusaServiceFetch(
          `/admin/payments/${payment.id}/capture`,
          {
            method: 'POST',
          },
        )
        if (capRes.ok) {
          captured = true
        } else {
          console.warn(
            `[POS orders] capture failed for payment ${payment.id}:`,
            await capRes.text().catch(() => ''),
          )
        }
      }
    } catch (captureErr) {
      // Non-fatal — the sale itself already succeeded, this just means
      // the payment has to be captured manually from the dashboard.
      console.warn('[POS orders] auto-capture failed:', captureErr)
    }

    // VAT invoice for the POS sale — both website and POS orders need
    // one per the status notes. Non-fatal: a failed invoice never blocks
    // the sale; staff can regenerate later from the dashboard's Resend
    // Invoice button.
    try {
      const invoiceOrderRes = await medusaServiceFetch(
        `/admin/orders/${order.id}?fields=id,currency_code,*items,*shipping_methods,customer.first_name,customer.last_name,shipping_address.address_1,shipping_address.address_2,shipping_address.city,shipping_address.postal_code,shipping_address.country_code`,
      )
      if (invoiceOrderRes.ok) {
        const { order: fullOrderForInvoice } = await invoiceOrderRes.json()
        const { generateInvoiceForOrder } =
          await import('@/lib/invoice-service')
        await generateInvoiceForOrder({
          ...fullOrderForInvoice,
          channel: 'pos',
        })
      }
    } catch (invoiceErr) {
      console.warn('[POS orders] invoice generation failed:', invoiceErr)
    }

    // BUG FIX: pickup orders were never actually marked "Fulfilled" in
    // Medusa — only tagged with metadata.fulfillment_type = 'pickup',
    // which the POS UI could read back but Medusa's own fulfillment_status
    // never changed, so the Medusa admin (and dashboard) kept showing
    // "Not fulfilled" forever even though the customer walked out with the
    // item at the counter.
    //
    // For a pickup sale, fulfillment is complete the moment the order is
    // rung up — so create the real Medusa fulfillment now.
    //
    // For a ship-to-customer sale (COD or otherwise), fulfillment must
    // stay pending: the item hasn't actually been delivered yet, even
    // though payment is already captured above. That gets marked
    // Fulfilled/Delivered later from the dashboard once the courier
    // confirms delivery — never automatically at order-creation time.
    // Mark as delivered in Medusa immediately only when BOTH:
    //   1. fulfillmentType === 'pickup'  — customer takes item at counter now
    //   2. payment_method === 'cash'     — COD, money collected at same time
    //
    // POS ship orders: item hasn't been delivered yet, courier will do it later.
    // Card/UPI pickup: payment captured but keep manual control in case of disputes.
    const isCashPickup =
      fulfillmentType === 'pickup' && payment_method === 'cash'

    let fulfilled = false
    if (fulfillmentType === 'pickup') {
      try {
        // Pass isCashPickup so Medusa's fulfillment_status goes all the way
        // to "delivered" (not just "fulfilled") for cash pickup sales.
        await fulfillOrder(order.id, medusaServiceFetch, isCashPickup)
        fulfilled = true
      } catch (fulfillErr) {
        console.warn('[POS orders] auto-fulfill failed:', fulfillErr)
      }
    }

    return NextResponse.json({ order, fulfilled, captured })
  } catch (err: any) {
    console.error('[POS] Orders route error:', err)
    return NextResponse.json(
      {
        error:
          err?.message ||
          'Unexpected error creating the order — check the server terminal for details.',
      },
      { status: 500 },
    )
  }
}
