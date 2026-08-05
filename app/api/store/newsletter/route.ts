// app/api/store/newsletter/route.ts
//
// Newsletter signup — the homepage and footer both had a "Subscribe"
// button that did nothing at all (no state, no handler).
//
// BUG FIX (data privacy): this used to store subscriber emails in
// `public/newsletter-subscribers.json` via Node's `fs`. That's a serious
// problem, not just a deployment one: anything under `public/` is served
// as a STATIC FILE at the site root by Next.js by default, so — on any
// host where the write actually succeeded — that file could be reachable
// at e.g. https://smashuk.co/newsletter-subscribers.json with NO
// authentication at all, leaking every subscriber's email address. (It
// also would have failed outright on Vercel, this app's stated deploy
// target, which has a read-only filesystem at request time.) Subscriber
// emails now live in Medusa's own `store.metadata.newsletterSubscribers` —
// genuine Postgres persistence via Medusa's admin API, never served as a
// static asset, and only reachable with an authenticated admin session.
//
// BUG FIX (broken promo code): the welcome email used to promise a
// hardcoded "SMASH10" code that was never a real coupon anywhere in the
// app (the storefront only recognized two other hardcoded, also-fake
// codes, since fixed to validate against real Medusa promotions — see
// app/api/store/cart/promotions/route.ts). Promising a fake code here
// would just result in every new subscriber immediately hitting "invalid
// coupon code" on their first visit, so it's been replaced with wording
// that doesn't promise a specific code that may not exist.

import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/email'
import { SITE_NAME } from '@/lib/constants'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { safeJson } from '@/lib/api/safe-json'

async function getStoreIdAndSubscribers(): Promise<{
  storeId: string
  subscribers: string[]
} | null> {
  const res = await medusaServiceFetch('/admin/stores?limit=1&fields=id,metadata')
  if (!res.ok) return null
  const { stores } = await safeJson(res, 'app/api/store/newsletter/route.ts')
  const store = stores?.[0]
  if (!store) return null
  return {
    storeId: store.id,
    subscribers: store.metadata?.newsletterSubscribers ?? [],
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }

    const normalized = email.trim().toLowerCase()

    const result = await getStoreIdAndSubscribers()
    if (!result) {
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    if (result.subscribers.includes(normalized)) {
      return NextResponse.json({ success: true, alreadySubscribed: true })
    }

    const updated = [...result.subscribers, normalized]
    const saveRes = await medusaServiceFetch(`/admin/stores/${result.storeId}`, {
      method: 'POST',
      body: JSON.stringify({ metadata: { newsletterSubscribers: updated } }),
    })
    if (!saveRes.ok) {
      const err = await saveRes.json().catch(() => ({}))
      console.error('[Newsletter] failed to save subscriber:', err)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    // Non-fatal — subscription is saved either way
    sendMail({
      to: normalized,
      subject: `Welcome to ${SITE_NAME}!`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#E8553A;">Welcome to ${SITE_NAME}!</h2>
          <p>Thanks for subscribing — keep an eye on your inbox for exclusive offers and new arrivals.</p>
        </div>
      `,
      text: `Welcome to ${SITE_NAME}! Keep an eye on your inbox for exclusive offers and new arrivals.`,
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Newsletter] subscribe error:', err.message)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
