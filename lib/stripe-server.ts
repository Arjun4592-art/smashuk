import Stripe from 'stripe';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? '';
export const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error('STRIPE_SECRET_KEY is not set in .env.local');
  }
  return stripe;
}
