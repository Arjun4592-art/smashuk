import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { notifyOwner } from '@/lib/email'
import {
  adminPaymentFailedEmail,
  adminDisputeEmail,
} from '@/lib/email-templates'
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? ''
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? ''
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const MEDUSA_API_KEY = process.env.MEDUSA_ADMIN_API_KEY ?? ''
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      {
        error: 'No signature',
      },
      {
        status: 400,
      },
    )
  }
  if (!stripe) {
    console.error('[Stripe Webhook] STRIPE_SECRET_KEY not configured')
    return NextResponse.json(
      {
        error: 'Not configured',
      },
      {
        status: 500,
      },
    )
  }
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error(
      '[Stripe Webhook] Signature verification failed:',
      err.message,
    )
    return NextResponse.json(
      {
        error: 'Invalid signature',
      },
      {
        status: 400,
      },
    )
  }
  switch (event.type) {
    case 'payment_intent.succeeded':
      // Deliberately a no-op: order creation, invoicing, and the customer
      // confirmation / admin new-order emails already happen synchronously
      // in the website's own checkout flow (app/api/store/payment's
      // `complete` action) right after Stripe confirms payment. Duplicating
      // that here — without a reliable payment_intent → Medusa order
      // mapping to dedupe against — risks double order records and double
      // emails, which is worse than doing nothing. If orders are ever
      // reported as "paid but missing" (e.g. the customer closed the tab
      // before the `complete` call finished), that's the real fix needed,
      // and it belongs here as a recovery step once there's a safe way to
      // look up the order for a given payment_intent.
      break
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      const reason = pi.last_payment_error?.message
      const customerEmail =
        typeof pi.receipt_email === 'string' ? pi.receipt_email : undefined
      const { subject, html, text, templateVariables } =
        adminPaymentFailedEmail({
          paymentIntentId: pi.id,
          amount: pi.amount / 100,
          currency: pi.currency,
          customerEmail,
          reason,
        })
      notifyOwner({
        subject,
        html,
        text,
        templateVariables,
        customerEmail,
      }).catch((err) =>
        console.error(
          '[Stripe Webhook] payment_failed admin email failed:',
          err,
        ),
      )
      break
    }
    case 'charge.dispute.created': {
      const dispute = event.data.object as Stripe.Dispute
      const chargeId =
        typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id
      const paymentIntentId =
        typeof dispute.payment_intent === 'string'
          ? dispute.payment_intent
          : dispute.payment_intent?.id
      const { subject, html, text, templateVariables } = adminDisputeEmail({
        chargeId,
        paymentIntentId,
        amount: dispute.amount / 100,
        currency: dispute.currency,
        reason: dispute.reason,
        evidenceDueBy: dispute.evidence_details?.due_by
          ? new Date(dispute.evidence_details.due_by * 1000)
          : undefined,
      })
      notifyOwner({ subject, html, text, templateVariables }).catch((err) =>
        console.error('[Stripe Webhook] dispute admin email failed:', err),
      )
      break
    }
  }
  return NextResponse.json({
    received: true,
  })
}
