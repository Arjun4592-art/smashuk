# Smash Racket Pro — Production Setup Guide

## 1. Seed smashuk.co Products into Medusa

Make sure Medusa backend is running on port 9000, then run:

```bash
# Install ts-node if needed
npm install -D ts-node

# Run the seed script
npx ts-node --esm scripts/seed-smashuk.ts
```

This will create:
- **5 parent categories** (Badminton, Tennis, Padel, Squash, Clothing)
- **14 sub-categories** (Badminton Rackets, Tennis Rackets, etc.)
- **40+ real products** from smashuk.co with actual prices, slugs and images
- **GBP pricing** throughout
- **Royal Mail shipping options**

---

## 2. Stripe Payment Setup

### Step 1 — Install Stripe module in Medusa backend

In your **Medusa backend** project (separate from this Next.js app):

```bash
npm install @medusajs/payment-stripe
```

### Step 2 — Configure Medusa backend `medusa-config.js`

```javascript
module.exports = defineConfig({
  modules: [
    {
      resolve: '@medusajs/payment-stripe',
      options: {
        apiKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      },
    },
  ],
})
```

### Step 3 — Add to your `.env.local` (Next.js frontend)

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

### Step 4 — Add to your Medusa backend `.env`

```env
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

### Step 5 — Enable Stripe in Medusa Admin

1. Go to `localhost:9000/app/settings/payment-providers`
2. Enable **Stripe** provider
3. Assign it to your **United Kingdom** region

### Step 6 — Set up Stripe Webhook

In Stripe Dashboard → Webhooks → Add endpoint:
- **URL**: `https://yourdomain.co.uk/api/webhooks/stripe`
- **Events**: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.dispute.created`

---

## 3. Royal Mail Shipping Setup

Royal Mail integration works via Medusa's shipping system. The seed script creates these options:

| Service | Price | Delivery |
|---------|-------|----------|
| Royal Mail Second Class | £3.99 | 2-3 days |
| Royal Mail First Class | £5.99 | 1-2 days |
| Royal Mail Tracked 48 | £4.99 | 2-3 days |
| Royal Mail Tracked 24 | £6.99 | Next day |
| Special Delivery Guaranteed | £9.99 | Next day guaranteed |
| Free Standard Shipping | £0.00 | Orders over £80 |

### To add shipping options in Medusa Admin manually:

1. Go to `localhost:9000/app/settings/locations`
2. Add a stock location (e.g., "UK Warehouse")
3. Go to `localhost:9000/app/settings/shipping`
4. Create shipping profiles and add the Royal Mail options above

### For live Royal Mail API integration:

Sign up at [https://developer.royalmail.net/](https://developer.royalmail.net/) and add:

```env
ROYAL_MAIL_CLIENT_ID=your_client_id
ROYAL_MAIL_CLIENT_SECRET=your_client_secret
ROYAL_MAIL_ACCOUNT_NUMBER=your_account_number
```

---

## 4. Environment Variables Summary

Add these to your **Next.js `.env.local`**:

```env
# Medusa
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.smashuk.co
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_xxxx
MEDUSA_ADMIN_API_KEY=sk_xxxx
MEDUSA_ADMIN_EMAIL=arjunmishra769@gmail.com
MEDUSA_ADMIN_PASSWORD=your_password

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxx
STRIPE_SECRET_KEY=sk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx

# Royal Mail (optional - for live API)
ROYAL_MAIL_CLIENT_ID=xxxx
ROYAL_MAIL_CLIENT_SECRET=xxxx

# Auth
NEXTAUTH_SECRET=xxxx
NEXTAUTH_URL=https://smashuk.co
GOOGLE_CLIENT_ID=xxxx
GOOGLE_CLIENT_SECRET=xxxx
```

---

## 5. Production Checklist

- [ ] Seed script run successfully
- [ ] Stripe enabled in Medusa admin
- [ ] Stripe assigned to UK region
- [ ] Stripe webhook configured
- [ ] Royal Mail shipping options added
- [ ] Stock location configured in Medusa
- [ ] Sales channel configured
- [ ] All env vars set in production
- [ ] `NEXTAUTH_URL` set to production domain
- [ ] Google OAuth redirect URIs updated for production domain
