import { NextRequest, NextResponse } from 'next/server'
import { requireStripe } from '@/lib/stripe-server'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { notifyOwner } from '@/lib/email'

const MIN_AGE_MIN = 10
const MAX_AGE_MIN = 25

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stripe = requireStripe()
    const now = Math.floor(Date.now() / 1000)

    // 1. Recent payments that actually took money
    const list = await stripe.paymentIntents.list({
      created: { gte: now - MAX_AGE_MIN * 60 },
      limit: 100,
      expand: ['data.latest_charge'],
    })
    const candidates = list.data.filter(
      (pi) =>
        (pi.status === 'succeeded' || pi.status === 'requires_capture') &&
        pi.created <= now - MIN_AGE_MIN * 60 &&
        // POS terminal payments are handled by the POS flow
        !pi.payment_method_types?.includes('card_present'),
    )
    if (candidates.length === 0) {
      return NextResponse.json({ checked: 0, orphans: 0 })
    }

    // 2. Payment Intent ids that already belong to a Medusa order (last 2 days)
    const since = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
    const res = await medusaServiceFetch(
      `/admin/orders?limit=500&order=-created_at&created_at[gte]=${encodeURIComponent(since)}&fields=id,display_id,*payment_collections.payments`,
    )
    if (!res.ok) {
      throw new Error(`Medusa orders fetch failed (${res.status})`)
    }
    const { orders } = await res.json()
    const known = new Set<string>()
    for (const o of orders ?? []) {
      for (const pc of o.payment_collections ?? []) {
        for (const p of pc.payments ?? []) {
          if (p?.data?.id) known.add(p.data.id)
        }
      }
    }

    // 3. Anything paid but not in Medusa -> alert
    const orphans = candidates.filter((pi) => !known.has(pi.id))
    for (const pi of orphans) {
      const charge: any =
        typeof pi.latest_charge === 'object' ? pi.latest_charge : null
      const email =
        pi.receipt_email || charge?.billing_details?.email || 'unknown'
      const name = charge?.billing_details?.name || ''
      const amount = `${(pi.amount / 100).toFixed(2)} ${pi.currency.toUpperCase()}`
      await notifyOwner({
        subject: `ACTION NEEDED: payment ${amount} received but no order (${email})`,
        text: `Payment ${amount} from ${name} ${email} (${pi.id}) was taken but no order exists. Create the order manually. Payment status: ${pi.status}.`,
        html: `<p><b>A payment was taken but no order was created.</b></p>
<p>Amount: ${amount}<br>Customer: ${name} ${email}<br>Payment Intent: ${pi.id}<br>Stripe status: ${pi.status}</p>
<p>Create the order manually in the admin (Drafts), or refund the customer in Stripe.</p>`,
      })
    }

    return NextResponse.json({
      checked: candidates.length,
      orphans: orphans.map((p) => p.id),
    })
  } catch (err: any) {
    console.error('[stripe-orphan-check]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
