import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? '';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const MEDUSA_API_KEY = process.env.MEDUSA_ADMIN_API_KEY ?? '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({
      error: 'No signature'
    }, {
      status: 400
    });
  }
  if (!stripe) {
    console.error('[Stripe Webhook] STRIPE_SECRET_KEY not configured');
    return NextResponse.json({
      error: 'Not configured'
    }, {
      status: 500
    });
  }
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return NextResponse.json({
      error: 'Invalid signature'
    }, {
      status: 400
    });
  }
  switch (event.type) {
    case 'payment_intent.succeeded':
      break;
    case 'payment_intent.payment_failed':
      break;
    case 'charge.dispute.created':
      break;
  }
  return NextResponse.json({
    received: true
  });
}
