'use client'

import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRightIcon, ShieldIcon } from '@/components/ui/Icons'
import {
  addShippingAddress,
  listShippingOptions,
  addShippingMethod,
  initiatePayment,
  placeOrder,
  getAddresses,
  createCart,
  addToCart,
  getCart,
} from '@/lib/api/store'
import { useAuthStore } from '@/store/authStore'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/constants'
import toast from 'react-hot-toast'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

// Same singleton pattern as components/website/account/PaymentMethodsTab.tsx.
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
)

// Stripe's own PaymentElement already surfaces Card + UPI (and any other
// method enabled in the Stripe Dashboard) inside a single embedded form.
// Stripe is the only payment method the website accepts — no Cash on
// Delivery / Bank Transfer.
const PAYMENT_METHOD = 'card'

// Renders the actual Stripe card form (must live inside <Elements> to use
// useStripe/useElements) and exposes confirmPayment() to the parent via a
// ref, so the parent's single "Place Order" button can drive it.
const StripeCardBlock = forwardRef(function StripeCardBlock(
  { onReady, returnUrl }: { onReady?: () => void; returnUrl: string },
  ref,
) {
  const stripe = useStripe()
  const elements = useElements()

  useImperativeHandle(ref, () => ({
    confirmPayment: async () => {
      if (!stripe || !elements) {
        throw new Error(
          'Payment form is still loading — try again in a moment.',
        )
      }
      // BUG FIX: Card doesn't need a redirect (redirect: 'if_required'
      // keeps the customer on this page for it, same as before), but
      // Amazon Pay / Revolut Pay ALWAYS require an off-site redirect step
      // — Stripe rejects the confirm call outright ("You must provide a
      // `return_url`...") without one, regardless of the 'if_required'
      // setting. /checkout/complete picks the customer back up after they
      // finish on Amazon/Revolut's side and finalizes the Medusa order —
      // see that page for the other half of this flow.
      const { error } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: { return_url: returnUrl },
      })
      if (error) {
        throw new Error(error.message ?? 'Card payment failed.')
      }
    },
  }))

  // BUG FIX: PaymentElement was mounted with no `options` at all, so Stripe
  // defaulted to also probing for Apple Pay / Google Pay wallet
  // availability. On a domain that isn't registered/verified for those
  // wallets in the Stripe Dashboard (Settings → Payment methods → Apple
  // Pay / Google Pay → add domain), that probe doesn't just fail cleanly —
  // it retries via repeated `payframe`/`session` requests to
  // pay.google.com in a loop that can run for minutes, and PaymentElement
  // doesn't fire `onReady` until every payment method (wallets included)
  // has finished resolving. That's exactly what was stuck at "Loading
  // payment options…" indefinitely. This app only ever accepts card (see
  // PAYMENT_METHOD above) — wallets aren't wired into confirmPayment()
  // anyway — so turn them off explicitly instead of relying on
  // auto-detection.
  return (
    <PaymentElement
      onReady={onReady}
      options={{
        wallets: { applePay: 'never', googlePay: 'never' },
      }}
    />
  )
})

export default function CheckoutPage() {
  const {
    items,
    subtotal,
    shipping,
    tax,
    taxRate,
    total,
    discountAmount,
    couponCode,
    cartId,
    clearCart,
  } = useCartStore()
  const router = useRouter()
  const [placing, setPlacing] = useState(false)
  const [cardClientSecret, setCardClientSecret] = useState('')
  const [cardLoading, setCardLoading] = useState(false)
  // Two-step checkout: customer fills address/delivery method first, then
  // explicitly continues to Payment. Previously the Stripe card form (and
  // its underlying payment session) loaded immediately on page load, in
  // full view, before the customer had entered a single detail — creating
  // a payment session for every visitor who merely landed on the page,
  // and showing "Payment" before there was anything to pay for yet.
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'payment'>(
    'details',
  )
  const [paymentElementReady, setPaymentElementReady] = useState(false)
  const cardRef = useRef<{ confirmPayment: () => Promise<void> }>(null)

  // BUG FIX: this used to always use the hardcoded FREE_SHIPPING_THRESHOLD
  // constant to decide which real shipping option to auto-select, so
  // changing "Free Shipping Threshold" on the dashboard's Settings >
  // Shipping page had zero effect here — it saved fine but was never
  // actually read. Fetch the real store-configured value, falling back to
  // the constant until it loads (or if the store hasn't set one).
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(
    FREE_SHIPPING_THRESHOLD,
  )
  useEffect(() => {
    fetch('/api/store/shipping-settings')
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.freeShippingThreshold === 'number') {
          setFreeShippingThreshold(data.freeShippingThreshold)
        }
      })
      .catch(() => {
        /* keep the constant fallback already set above */
      })
  }, [])

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  })

  // Billing address — defaults to "same as shipping" (most common case).
  // Uncheck to bill a different address (e.g. a company address) than the
  // one the order ships/is collected to.
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true)
  const [billingForm, setBillingForm] = useState({
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  })
  const handleBillingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBillingForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  // NEW: auto-fill from the logged-in customer's account so they don't
  // have to retype their name/email/phone/address on every order — pulls
  // the profile from the auth store (name/email/phone) and their default
  // (or first) saved address from Account → Addresses, if any exist.
  const { user, isAuthenticated } = useAuthStore()
  useEffect(() => {
    if (!isAuthenticated || !user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: standard data-fetch/derived-state pattern (set loading/derived state synchronously, real work happens async or on next tick); reviewed, not a bug.
    setForm((f) => ({
      ...f,
      name: f.name || user.name || '',
      email: f.email || user.email || '',
      phone: f.phone || user.phone || '',
    }))

    getAddresses()
      .then((addresses) => {
        const preferred =
          addresses.find((a) => a.is_default_shipping) ?? addresses[0]
        if (!preferred) return
        setForm((f) => ({
          ...f,
          name:
            f.name || `${preferred.first_name} ${preferred.last_name}`.trim(),
          phone: f.phone || preferred.phone || '',
          line1: f.line1 || preferred.address_1 || '',
          line2: f.line2 || preferred.address_2 || '',
          city: f.city || preferred.city || '',
          state: f.state || preferred.province || '',
          pincode: f.pincode || preferred.postal_code || '',
        }))
      })
      .catch(() => {
        // No saved addresses yet — fine, customer just fills it in manually.
      })
    // Only run once when auth state resolves, not on every form keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id])

  // NEW: delivery method picker. Previously the page silently used
  // shippingOptions[0] with no UI at all, so a customer could never choose
  // "Store Pickup" even if it existed in Medusa — this surfaces every
  // shipping option Medusa returns (Royal Mail, Store Pickup, etc.) so the
  // customer picks explicitly, same as the payment method list below it.
  const [shippingOptions, setShippingOptions] = useState<any[]>([])
  const [selectedShippingOptionId, setSelectedShippingOptionId] = useState('')
  const [shippingLoading, setShippingLoading] = useState(false)

  // BUG FIX: cartId is persisted in localStorage, but the actual Medusa
  // cart can be stale (expired, already completed, or items never synced).
  // Validate the cart on page load — if it's missing or empty in Medusa,
  // rebuild it from the local items in the store so checkout never hits
  // "Cannot complete a cart with no items".
  //
  // REAL BUG that was here: this effect had an EMPTY dependency array
  // (`[]`), so it only ran once, on the very first render — using
  // whatever `cartId`/`items` were in the closure AT THAT INSTANT. But
  // zustand's `persist` middleware rehydrates from localStorage
  // asynchronously, *after* the first client render. So on first render
  // `cartId` was still `null` (nothing rehydrated yet) → the `if (!cartId
  // ...) return` guard fired immediately and the whole validation was
  // skipped. A moment later the real (possibly stale) cartId/items
  // rehydrated and got used everywhere else on the page, but this
  // validate-and-rebuild logic never got a second chance to run — so a
  // cart that pointed at an emptied/expired Medusa cart sailed straight
  // through to `complete` and failed with "Cannot complete a cart with no
  // items". Fixing the deps array to actually react to `cartId`/`items`
  // becoming available (guarded by a ref so it only validates once, not
  // on every quantity change) fixes this at the root.
  const { setCartId } = useCartStore()
  const cartValidatedRef = useRef(false)
  useEffect(() => {
    if (!cartId || items.length === 0) return
    if (cartValidatedRef.current) return
    cartValidatedRef.current = true
    let cancelled = false
    ;(async () => {
      try {
        const medusaCart = await getCart(cartId)
        // Cart is missing or has no items in Medusa — rebuild it
        if (!medusaCart || !medusaCart.items?.length) {
          const newCart = await createCart()
          if (cancelled || !newCart?.id) return
          setCartId(newCart.id)
          // Re-add all local items to the new cart
          for (const item of items) {
            const variantId =
              item.variant?.id ?? (item.product as any).variants?.[0]?.id
            if (variantId) {
              await addToCart(newCart.id, variantId, item.quantity).catch(
                () => {},
              )
            }
          }
        }
      } catch {
        // Non-fatal — checkout will surface the real error when placing the order
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cartId, items.length, items, setCartId])

  useEffect(() => {
    if (!cartId) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: standard data-fetch/derived-state pattern (set loading/derived state synchronously, real work happens async or on next tick); reviewed, not a bug.
    setShippingLoading(true)
    listShippingOptions(cartId)
      .then((opts) => {
        if (cancelled) return
        setShippingOptions(opts)
      })
      .catch(() => {
        if (!cancelled) setShippingOptions([])
      })
      .finally(() => {
        if (!cancelled) setShippingLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [cartId])

  const isPickupOption = (name: string) => /pickup|store|collect/i.test(name)
  const pickupOption = shippingOptions.find((o) => isPickupOption(o.name ?? ''))
  // REVERTED: previously trusted Medusa's own conditional calculated_price
  // on a single "Royal Mail" option configured with a £80 conditional
  // pricing rule in Medusa Admin. Live debugging (a temporary on-page
  // debug dump) showed Medusa's STORE API returns calculated_amount: 0
  // for that option even on a £44.99 cart — its conditional shipping-
  // option pricing isn't evaluating correctly from the store context.
  // This is a Medusa-side issue, not fixable from here, so we stop
  // depending on it. Back to computing the £80 rule ourselves and
  // picking between two separately, FLATLY priced Medusa options (no
  // conditions on either) — this only needs Medusa to report a correct
  // flat price per option (reliable), not evaluate a conditional rule for
  // us (unreliable in this setup). Requires: "Royal Mail" priced flat
  // £4.99 (no conditions), "Free Shipping" priced flat £0 (no conditions).
  const isFreeDeliveryOption = (opt: any) =>
    !isPickupOption(opt.name ?? '') && /free/i.test(opt.name ?? '')
  const isPaidDeliveryOption = (opt: any) =>
    !isPickupOption(opt.name ?? '') && !isFreeDeliveryOption(opt)
  const freeDeliveryOption = shippingOptions.find(isFreeDeliveryOption)
  const paidDeliveryOption = shippingOptions.find(isPaidDeliveryOption)
  const resolvedDeliveryOption =
    (subtotal >= freeShippingThreshold
      ? freeDeliveryOption
      : paidDeliveryOption) ??
    freeDeliveryOption ??
    paidDeliveryOption
  const resolvedDeliveryAmount =
    resolvedDeliveryOption === freeDeliveryOption
      ? 0
      : // BUG FIX: unlike product unit_price (pence), Medusa's shipping-
        // option calculated_price.calculated_amount comes back already in
        // pounds — confirmed via a live debug dump showing
        // calculated_amount: 4.99 for a real £4.99 option. Dividing by 100
        // (copied from the product-price pattern elsewhere in this file)
        // turned that into £0.05. No conversion needed here.
        (resolvedDeliveryOption?.calculated_price?.calculated_amount ??
        resolvedDeliveryOption?.amount ??
        0)
  const isPickupSelected =
    !!pickupOption && selectedShippingOptionId === pickupOption.id
  const displayShipping = isPickupSelected
    ? 0
    : resolvedDeliveryOption
      ? resolvedDeliveryAmount
      : shipping // options still loading — fall back to the estimate briefly
  const displayTotal = subtotal - discountAmount + displayShipping + tax
  // Re-resolves if the customer adds/removes items and crosses £80 after
  // already picking Delivery — this now genuinely swaps to a different
  // option id (Free Shipping vs Royal Mail), unlike the reverted approach
  // where it was the same id with a Medusa-computed price that changed.
  useEffect(() => {
    if (!resolvedDeliveryOption) return
    if (pickupOption && selectedShippingOptionId === pickupOption.id) return
    if (selectedShippingOptionId !== resolvedDeliveryOption.id) {
      setSelectedShippingOptionId(resolvedDeliveryOption.id)
    }
  }, [resolvedDeliveryOption?.id, pickupOption, selectedShippingOptionId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  // BUG FIX: previously the "Credit / Debit Card" option existed in the
  // list but no actual Stripe card form was ever rendered anywhere on the
  // page — the code created a payment session server-side and immediately
  // discarded the response (never read the client_secret), so there was
  // nothing for the customer to enter their card into, and nothing to
  // confirm before the cart was completed. This fetches the client_secret
  // as soon as Card is selected so <StripeCardBlock> can mount.
  useEffect(() => {
    if (cardClientSecret || !cartId || checkoutStep !== 'payment') return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: standard data-fetch/derived-state pattern (set loading/derived state synchronously, real work happens async or on next tick); reviewed, not a bug.
    setCardLoading(true)
    ;(async () => {
      try {
        const collectionRes = await fetch('/api/store/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: 'create-collection', cartId }),
        })
        const collectionData = await collectionRes.json()
        const collectionId = collectionData?.payment_collection?.id
        if (!collectionId) {
          throw new Error(
            collectionData?.error ??
              collectionData?.message ??
              'Could not start payment — the cart may be empty or the backend unreachable.',
          )
        }

        const sessionRes = await fetch('/api/store/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'create-session',
            cartId,
            collectionId,
            providerId: 'pp_stripe_stripe',
          }),
        })
        const sessionData = await sessionRes.json()
        const secret =
          sessionData?.payment_collection?.payment_sessions?.[0]?.data
            ?.client_secret ?? sessionData?.payment_session?.data?.client_secret
        if (!secret) {
          // BUG FIX: this used to always throw the same generic "Could not
          // start card payment" no matter what actually went wrong, which
          // made it impossible to tell a Stripe-not-configured-on-Medusa
          // issue apart from a network blip or an unpublished product.
          // Surfacing the real backend message (Medusa forwards Stripe's
          // own error text on failure) tells you exactly what to fix.
          const reason =
            sessionData?.error ??
            sessionData?.message ??
            'the "Stripe" payment provider is not enabled for this region in Medusa Admin → Settings → Regions, or STRIPE_API_KEY is missing on the Medusa backend'
          throw new Error(`Could not start card payment — ${reason}`)
        }
        if (!cancelled) setCardClientSecret(secret)
      } catch (err: any) {
        if (!cancelled) {
          toast.error(err.message ?? 'Could not load card payment form', {
            duration: 6000,
          })
        }
      } finally {
        if (!cancelled) setCardLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cartId, cardClientSecret, checkoutStep])

  // Step 1 → 2: validate address/billing, save them + the chosen delivery
  // method to the cart, then reveal Payment. Splitting this out means the
  // customer's address is already safely saved on the cart before they
  // ever see a card form — if they abandon here, nothing payment-related
  // was ever created for them.
  const handleContinueToPayment = async () => {
    if (!cartId) {
      toast.error('Cart not found. Please add items again.')
      return
    }

    if (
      !form.name ||
      !form.email ||
      !form.line1 ||
      !form.city ||
      !form.pincode
    ) {
      toast.error('Please fill all required fields.')
      return
    }

    if (
      !billingSameAsShipping &&
      (!billingForm.name ||
        !billingForm.line1 ||
        !billingForm.city ||
        !billingForm.pincode)
    ) {
      toast.error('Please fill all required billing address fields.')
      return
    }

    setPlacing(true)
    try {
      const [firstName, ...rest] = form.name.split(' ')

      const shippingAddress = {
        first_name: firstName,
        last_name: rest.join(' ') || '',
        address_1: form.line1,
        address_2: form.line2 || undefined,
        city: form.city,
        province: form.state,
        postal_code: form.pincode,
        country_code: 'gb',
        phone: form.phone || undefined,
      }

      const billingAddress = billingSameAsShipping
        ? undefined
        : (() => {
            const [billingFirstName, ...billingRest] =
              billingForm.name.split(' ')
            return {
              first_name: billingFirstName,
              last_name: billingRest.join(' ') || '',
              address_1: billingForm.line1,
              address_2: billingForm.line2 || undefined,
              city: billingForm.city,
              province: billingForm.state,
              postal_code: billingForm.pincode,
              country_code: 'gb',
            }
          })()

      await addShippingAddress(
        cartId,
        shippingAddress,
        billingAddress,
        form.email,
      )

      const optionId = selectedShippingOptionId || shippingOptions[0]?.id
      if (optionId) {
        await addShippingMethod(cartId, optionId)
      }

      setCheckoutStep('payment')
    } catch (err: any) {
      toast.error(
        err.message ?? 'Could not save your details. Please try again.',
      )
    } finally {
      setPlacing(false)
    }
  }

  // Step 2: address + delivery method are already saved on the cart by
  // handleContinueToPayment above — this just confirms the Stripe payment
  // and completes the order.
  const handlePlaceOrder = async () => {
    if (!cartId) {
      toast.error('Cart not found. Please add items again.')
      return
    }

    setPlacing(true)
    try {
      // Payment — Stripe card only. The payment session + client_secret
      // was already created by the useEffect above as soon as this step
      // was reached. Confirm it now via the mounted <PaymentElement>.
      if (!cardClientSecret) {
        throw new Error(
          'Card payment form is still loading — please wait a moment and try again.',
        )
      }
      if (!cardRef.current) {
        throw new Error('Card payment form not ready.')
      }
      await cardRef.current.confirmPayment()

      // Complete the cart (place order). Card is already confirmed via
      // Stripe above.
      // BUG FIX: previously only sent { payment_method }, so an order placed
      // with "Store Pickup" selected looked identical to a normal courier
      // order everywhere downstream — lib/order-status.ts and the Orders
      // dashboard both key off `metadata.fulfillment_type === 'pickup'`
      // (already set correctly by the POS's FulfillmentModal) to know a
      // sale is collected in-store rather than shipped. Without this flag,
      // staff had no reliable way to tell "customer picking this up" orders
      // apart from "needs a courier" ones in the orders list — tagging it
      // here makes website pickup orders show up and filter the same way
      // POS pickup sales already do.
      const selectedOption = shippingOptions.find(
        (o) => o.id === (selectedShippingOptionId || shippingOptions[0]?.id),
      )
      const isPickupOrder = isPickupOption(selectedOption?.name ?? '')

      const completeRes = await fetch('/api/store/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'complete',
          cartId,
          metadata: {
            payment_method: PAYMENT_METHOD,
            ...(isPickupOrder
              ? {
                  fulfillment_type: 'pickup',
                  // Store the contact name/phone directly on the order
                  // metadata too — the shipping_address already has these,
                  // but staff scanning the Orders list for "who's this for"
                  // during a busy in-store pickup shouldn't have to open
                  // the order detail page just to see a name.
                  pickup_contact_name: form.name,
                  pickup_contact_phone: form.phone || undefined,
                }
              : {}),
          },
        }),
      })
      const completeData = await completeRes.json()

      if (!completeRes.ok) {
        throw new Error(completeData?.message ?? 'Order placement failed')
      }

      clearCart()
      toast.success('Order placed successfully! 🎉')
      router.push('/profile?tab=orders')
    } catch (err: any) {
      toast.error(err?.message ?? 'Order placement failed. Try again.')
    } finally {
      setPlacing(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className='min-h-screen bg-white flex flex-col items-center justify-center py-20 px-4 text-center'>
        <h1 className='font-montserrat font-black text-3xl text-[#0A1F44] mb-3'>
          Cart is empty
        </h1>
        <Link
          href='/shop'
          className='bg-[#E8553A] text-white font-montserrat font-bold px-6 py-3 rounded-full'
        >
          Shop Now →
        </Link>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-[#F2F4F7]'>
      <div className='bg-[#0A1F44] py-10'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center gap-2 text-white/60 text-sm font-lato mb-3'>
            <Link href='/' className='hover:text-white'>
              Home
            </Link>
            <ChevronRightIcon size={14} />
            <Link href='/cart' className='hover:text-white'>
              Cart
            </Link>
            <ChevronRightIcon size={14} />
            <span className='text-white'>Checkout</span>
          </div>
          <h1 className='font-montserrat font-black text-3xl text-white'>
            Checkout
          </h1>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Form */}
          <div className='lg:col-span-2 space-y-5'>
            <div className='bg-white rounded-2xl p-6 border border-gray-100'>
              <h2 className='font-montserrat font-black text-xl text-[#0A1F44] mb-5'>
                Shipping Address
              </h2>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                {[
                  {
                    name: 'name',
                    label: 'Full Name *',
                    placeholder: 'John Smith',
                  },
                  {
                    name: 'email',
                    label: 'Email *',
                    placeholder: 'john@example.com',
                  },
                  {
                    name: 'phone',
                    label: 'Phone',
                    placeholder: '+44 7700 900000',
                  },
                  {
                    name: 'pincode',
                    label: 'Postcode *',
                    placeholder: 'SW1A 1AA',
                  },
                  {
                    name: 'line1',
                    label: 'Address Line 1 *',
                    placeholder: '10 Downing Street',
                    colSpan: true,
                  },
                  {
                    name: 'line2',
                    label: 'Address Line 2 (Optional)',
                    placeholder: 'Flat / Apartment',
                    colSpan: true,
                  },
                  { name: 'city', label: 'City *', placeholder: 'London' },
                  {
                    name: 'state',
                    label: 'County',
                    placeholder: 'Greater London',
                  },
                ].map((field) => (
                  <div
                    key={field.name}
                    className={(field as any).colSpan ? 'sm:col-span-2' : ''}
                  >
                    <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-montserrat'>
                      {field.label}
                    </label>
                    <input
                      type='text'
                      name={field.name}
                      value={(form as any)[field.name]}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato text-[#0A1F44]'
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className='bg-white rounded-2xl p-6 border border-gray-100'>
              <h2 className='font-montserrat font-black text-xl text-[#0A1F44] mb-5'>
                Delivery Method
              </h2>
              {shippingLoading ? (
                <p className='text-sm text-gray-400 font-lato'>
                  Loading delivery options…
                </p>
              ) : shippingOptions.length === 0 ? (
                <p className='text-sm text-gray-400 font-lato'>
                  No delivery options available.
                </p>
              ) : (
                <div className='space-y-2.5'>
                  {/* Home Delivery — Royal Mail's shipping option now has
                      its own conditional pricing rule in Medusa Admin
                      (£4.99 below £80 cart total, £0 at/above it), so
                      whatever calculated_price comes back for it IS
                      already the correct price — no separate frontend
                      £80 check needed, no second "Free Shipping" option
                      to juggle. Single source of truth in Medusa. */}
                  {resolvedDeliveryOption && (
                    <button
                      onClick={() =>
                        setSelectedShippingOptionId(resolvedDeliveryOption.id)
                      }
                      className={`w-full flex items-center justify-between gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                        selectedShippingOptionId === resolvedDeliveryOption.id
                          ? 'border-[#E8553A] bg-[#E8553A]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className='flex items-center gap-3'>
                        <span className='text-xl'>🚚</span>
                        <div>
                          <p
                            className={`font-lato font-semibold text-sm ${
                              selectedShippingOptionId ===
                              resolvedDeliveryOption.id
                                ? 'text-[#E8553A]'
                                : 'text-[#0A1F44]'
                            }`}
                          >
                            Home Delivery{' '}
                            <span className='font-normal text-gray-400'>
                              (1-3 days)
                            </span>
                          </p>
                          <p className='text-xs text-gray-400 font-lato'>
                            {resolvedDeliveryAmount === 0
                              ? `Free on orders above ${formatCurrency(freeShippingThreshold)}`
                              : `Add ${formatCurrency(Math.max(freeShippingThreshold - subtotal, 0))} more for free delivery`}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-montserrat font-bold text-sm ${
                          selectedShippingOptionId === resolvedDeliveryOption.id
                            ? 'text-[#E8553A]'
                            : 'text-[#0A1F44]'
                        }`}
                      >
                        {resolvedDeliveryAmount === 0
                          ? 'FREE'
                          : formatCurrency(resolvedDeliveryAmount)}
                      </span>
                    </button>
                  )}

                  {pickupOption && (
                    <button
                      onClick={() =>
                        setSelectedShippingOptionId(pickupOption.id)
                      }
                      className={`w-full flex items-center justify-between gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                        selectedShippingOptionId === pickupOption.id
                          ? 'border-[#E8553A] bg-[#E8553A]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className='flex items-center gap-3'>
                        <span className='text-xl'>🏬</span>
                        <div>
                          <p
                            className={`font-lato font-semibold text-sm ${
                              selectedShippingOptionId === pickupOption.id
                                ? 'text-[#E8553A]'
                                : 'text-[#0A1F44]'
                            }`}
                          >
                            Store Pickup
                          </p>
                          <p className='text-xs text-gray-400 font-lato'>
                            Collect from our store — no delivery wait
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-montserrat font-bold text-sm ${
                          selectedShippingOptionId === pickupOption.id
                            ? 'text-[#E8553A]'
                            : 'text-[#0A1F44]'
                        }`}
                      >
                        FREE
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className='bg-white rounded-2xl p-6 border border-gray-100'>
              <div className='flex items-center justify-between mb-5'>
                <h2 className='font-montserrat font-black text-xl text-[#0A1F44]'>
                  Billing Address
                </h2>
                <label className='flex items-center gap-2 text-xs font-lato text-gray-500 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={billingSameAsShipping}
                    onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                    className='rounded border-gray-300 text-[#E8553A] focus:ring-[#E8553A]'
                  />
                  Same as shipping address
                </label>
              </div>
              {!billingSameAsShipping && (
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {[
                    {
                      name: 'name',
                      label: 'Full Name *',
                      placeholder: 'John Smith',
                      colSpan: true,
                    },
                    {
                      name: 'pincode',
                      label: 'Postcode *',
                      placeholder: 'SW1A 1AA',
                    },
                    {
                      name: 'line1',
                      label: 'Address Line 1 *',
                      placeholder: '10 Downing Street',
                      colSpan: true,
                    },
                    {
                      name: 'line2',
                      label: 'Address Line 2 (Optional)',
                      placeholder: 'Flat / Apartment',
                      colSpan: true,
                    },
                    { name: 'city', label: 'City *', placeholder: 'London' },
                    {
                      name: 'state',
                      label: 'County',
                      placeholder: 'Greater London',
                    },
                  ].map((field) => (
                    <div
                      key={field.name}
                      className={field.colSpan ? 'sm:col-span-2' : ''}
                    >
                      <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-montserrat'>
                        {field.label}
                      </label>
                      <input
                        type='text'
                        name={field.name}
                        value={(billingForm as any)[field.name]}
                        onChange={handleBillingChange}
                        placeholder={field.placeholder}
                        className='w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato text-[#0A1F44]'
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className='bg-white rounded-2xl p-5 border border-gray-100 sticky top-28'>
              <h3 className='font-montserrat font-bold text-[#0A1F44] mb-4'>
                Order Summary
              </h3>

              <div className='space-y-3 mb-5 max-h-48 overflow-y-auto'>
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className='flex items-center gap-3'
                  >
                    <div className='w-12 h-12 rounded-lg overflow-hidden bg-gray-50 shrink-0 border border-gray-100'>
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className='w-full h-full object-cover'
                      />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs font-semibold text-[#0A1F44] font-montserrat truncate'>
                        {item.product.name}
                      </p>
                      <p className='text-xs text-gray-400 font-lato'>
                        Qty: {item.quantity}
                      </p>
                      {item.metadata?.service_type === 'stringing' && (
                        <p className='text-[11px] text-[#B54708] font-lato truncate'>
                          📅 {item.metadata.booking_date} ·{' '}
                          {item.metadata.booking_time}
                        </p>
                      )}
                    </div>
                    <span className='text-sm font-black font-montserrat text-[#0A1F44]'>
                      {formatCurrency(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className='space-y-2.5 text-sm font-lato border-t border-gray-100 pt-4'>
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Subtotal</span>
                  <span className='font-semibold'>
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className='flex justify-between text-green-600'>
                    <span>Discount</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Shipping</span>
                  <span
                    className={
                      displayShipping === 0
                        ? 'text-green-600 font-semibold'
                        : 'font-semibold'
                    }
                  >
                    {displayShipping === 0
                      ? 'FREE'
                      : formatCurrency(displayShipping)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-500'>
                    VAT ({Math.round(taxRate * 100)}%)
                  </span>
                  <span className='font-semibold'>{formatCurrency(tax)}</span>
                </div>
                <div className='flex justify-between border-t border-gray-100 pt-3 text-base'>
                  <span className='font-montserrat font-black text-[#0A1F44]'>
                    Total
                  </span>
                  <span className='font-montserrat font-black text-[#0A1F44] text-xl'>
                    {formatCurrency(displayTotal)}
                  </span>
                </div>
              </div>

              {checkoutStep === 'details' && (
                <button
                  onClick={handleContinueToPayment}
                  disabled={placing}
                  className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-montserrat font-black text-base mt-5 transition-all ${placing ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#E8553A] hover:bg-[#D4441F] text-white shadow-lg hover:-translate-y-0.5'}`}
                >
                  {placing ? 'Saving details...' : 'Continue to Payment'}
                </button>
              )}

              <div className='flex items-center justify-center gap-1.5 mt-3'>
                <ShieldIcon size={14} className='text-gray-400' />
                <p className='text-xs text-gray-400 font-lato'>
                  Secured by 256-bit SSL encryption
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment modal — opens after "Continue to Payment", instead of the
          card form just appearing inline further down the same page. Address
          + delivery method are already saved on the cart by this point
          (handleContinueToPayment), so "← Edit details" here just closes
          the modal and goes back to step 1 without losing anything. */}
      {checkoutStep === 'payment' && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='absolute inset-0 bg-black/50'
            onClick={() => {
              setCheckoutStep('details')
              setPaymentElementReady(false)
            }}
          />
          <div className='relative bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl'>
            <div className='p-6'>
              <div className='flex items-center justify-between mb-5'>
                <h2 className='font-montserrat font-black text-xl text-[#0A1F44]'>
                  Payment
                </h2>
                <button
                  onClick={() => {
                    setCheckoutStep('details')
                    setPaymentElementReady(false)
                  }}
                  className='text-sm font-lato font-semibold text-[#E8553A] hover:underline'
                >
                  ← Edit details
                </button>
              </div>

              <div className='flex items-center gap-3 p-4 rounded-xl border-2 border-[#E8553A] bg-[#E8553A]/5'>
                <span className='text-2xl'>💳</span>
                <span className='font-lato font-semibold text-sm text-[#E8553A]'>
                  Card (Stripe — secure checkout)
                </span>
              </div>

              <div className='mt-4 pt-4 border-t border-gray-100'>
                {!cardClientSecret && (
                  <div className='flex items-center justify-center gap-2.5 py-8'>
                    <div className='w-5 h-5 border-2 border-gray-200 border-t-[#E8553A] rounded-full animate-spin' />
                    <p className='text-sm text-gray-400 font-lato'>
                      {cardLoading
                        ? 'Loading secure card form…'
                        : 'Preparing payment form…'}
                    </p>
                  </div>
                )}
                {cardClientSecret && (
                  <>
                    {!paymentElementReady && (
                      <div className='flex items-center justify-center gap-2.5 py-8'>
                        <div className='w-5 h-5 border-2 border-gray-200 border-t-[#E8553A] rounded-full animate-spin' />
                        <p className='text-sm text-gray-400 font-lato'>
                          Loading payment options…
                        </p>
                      </div>
                    )}
                    {/* Kept mounted (just visually hidden) rather than
                        conditionally rendered — unmounting/remounting
                        Elements would reset Stripe's internal state and
                        onReady would never get a chance to fire again. */}
                    <div className={paymentElementReady ? '' : 'hidden'}>
                      <Elements
                        stripe={stripePromise}
                        options={{ clientSecret: cardClientSecret }}
                      >
                        <StripeCardBlock
                          ref={cardRef}
                          onReady={() => setPaymentElementReady(true)}
                          returnUrl={
                            typeof window !== 'undefined'
                              ? `${window.location.origin}/checkout/complete?cart_id=${cartId}`
                              : ''
                          }
                        />
                      </Elements>
                    </div>
                  </>
                )}
              </div>

              <div className='flex justify-between items-center mt-5 pt-4 border-t border-gray-100'>
                <span className='font-lato text-sm text-gray-500'>
                  Total due
                </span>
                <span className='font-montserrat font-black text-lg text-[#0A1F44]'>
                  {formatCurrency(displayTotal)}
                </span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={
                  placing ||
                  cardLoading ||
                  !cardClientSecret ||
                  !paymentElementReady
                }
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-montserrat font-black text-base mt-4 transition-all ${placing ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#E8553A] hover:bg-[#D4441F] text-white shadow-lg hover:-translate-y-0.5'}`}
              >
                {placing
                  ? 'Placing Order...'
                  : `Pay ${formatCurrency(displayTotal)}`}
              </button>

              <div className='flex items-center justify-center gap-1.5 mt-3'>
                <ShieldIcon size={14} className='text-gray-400' />
                <p className='text-xs text-gray-400 font-lato'>
                  Secured by 256-bit SSL encryption
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
