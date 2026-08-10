'use client'

// app/(website)/checkout/complete/page.tsx
//
// Landing page Stripe redirects the customer back to after they finish an
// off-site payment step (Amazon Pay, Revolut Pay). Card payments never hit
// this page at all — confirmPayment() on the main checkout page uses
// redirect: 'if_required', so a card confirms and completes without ever
// leaving /checkout.
//
// BUG FIX: previously stripe.confirmPayment() had no `return_url`, which
// Stripe requires for any payment method that needs an off-site redirect
// step (Amazon Pay, Revolut Pay) — confirming failed outright with
// "You must provide a `return_url`...". Now that a return_url is passed,
// this is the other half of that flow: Stripe appends
// `payment_intent` / `redirect_status` query params here once the customer
// finishes on Amazon's/Revolut's side, and this page finalizes the actual
// Medusa order — mirroring exactly what handlePlaceOrder() on the main
// checkout page does after a same-page card confirmation.
//
// The full-page redirect away and back means React state (the checkout
// form, selected shipping option, etc.) is gone — but that's fine, because
// handleContinueToPayment() already saved the shipping address + shipping
// method onto the Medusa cart *before* the customer ever reached the
// payment step. This page just re-reads that from the cart itself instead
// of relying on component state that no longer exists.

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import { getCart } from '@/lib/api/store'

const isPickupOption = (name: string) => /pickup|store|collect/i.test(name)

type Status = 'checking' | 'completing' | 'success' | 'error'

function CompleteInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clearCart = useCartStore((s) => s.clearCart)
  const storeCartId = useCartStore((s) => s.cartId)

  const [status, setStatus] = useState<Status>('checking')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    // Prefer the cart_id we put in the return_url ourselves — more
    // reliable than waiting on the Zustand store to rehydrate from
    // localStorage after a full page navigation, though it should match.
    const cartId = searchParams.get('cart_id') || storeCartId
    const redirectStatus = searchParams.get('redirect_status')

    if (!cartId) {
      setStatus('error')
      setErrorMessage('Missing cart reference. Please try checking out again.')
      return
    }

    if (redirectStatus !== 'succeeded') {
      // 'failed' / 'canceled' / anything else — the customer backed out or
      // the payment genuinely failed on Amazon's/Revolut's side. Nothing
      // was ever placed in Medusa, so just send them back to try again.
      setStatus('error')
      setErrorMessage(
        redirectStatus === 'failed' || redirectStatus === 'canceled'
          ? 'Payment was not completed. No charge was made — please try again.'
          : 'Could not confirm payment status. Please try again.',
      )
      return
    }

    let cancelled = false
    ;(async () => {
      setStatus('completing')
      try {
        const cart = await getCart(cartId)
        if (!cart) {
          throw new Error(
            'Cart not found — it may have already been completed.',
          )
        }

        const shippingMethodName =
          cart.shipping_methods?.[0]?.name ??
          cart.shipping_methods?.[0]?.shipping_option?.name ??
          ''
        const isPickupOrder = isPickupOption(shippingMethodName)
        const address = cart.shipping_address

        // This page only ever runs after an off-site redirect (Amazon Pay,
        // Revolut Pay) — card confirms same-page and never lands here (see
        // the file header comment). Look up which of the two the customer
        // actually used instead of hardcoding 'card', so orders paid via
        // Amazon Pay / Revolut Pay are correctly tagged for staff.
        const paymentIntentId = searchParams.get('payment_intent')
        let actualPaymentMethod = 'card'
        if (paymentIntentId) {
          try {
            const methodRes = await fetch('/api/store/payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                action: 'get-method',
                paymentIntentId,
              }),
            })
            const methodData = await methodRes.json()
            actualPaymentMethod = methodData?.payment_method ?? 'card'
          } catch {
            // Non-fatal — falls back to 'card' below
          }
        }

        const completeRes = await fetch('/api/store/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'complete',
            cartId,
            metadata: {
              payment_method: actualPaymentMethod,
              ...(isPickupOrder
                ? {
                    fulfillment_type: 'pickup',
                    pickup_contact_name: address
                      ? `${address.first_name ?? ''} ${address.last_name ?? ''}`.trim()
                      : undefined,
                    pickup_contact_phone: address?.phone || undefined,
                  }
                : {}),
            },
          }),
        })
        const completeData = await completeRes.json()
        if (!completeRes.ok) {
          throw new Error(completeData?.message ?? 'Order placement failed')
        }

        if (cancelled) return
        clearCart()
        setStatus('success')
        setTimeout(() => {
          router.push('/profile?tab=orders')
        }, 1500)
      } catch (err: any) {
        if (cancelled) return
        setStatus('error')
        setErrorMessage(
          err?.message ??
            'Payment succeeded but we could not finalize your order. Contact support with your payment reference.',
        )
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className='min-h-screen bg-[#F2F4F7] flex items-center justify-center px-4'>
      <div className='w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center'>
        {(status === 'checking' || status === 'completing') && (
          <>
            <div className='w-10 h-10 border-4 border-gray-200 border-t-[#E8553A] rounded-full animate-spin mx-auto mb-5' />
            <h1 className='font-montserrat font-black text-xl text-[#0A1F44] mb-2'>
              Finalizing your order…
            </h1>
            <p className='text-sm text-gray-500 font-lato'>
              Please don&apos;t close this page.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className='w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-2xl mx-auto mb-5'>
              ✓
            </div>
            <h1 className='font-montserrat font-black text-xl text-[#0A1F44] mb-2'>
              Order placed successfully! 🎉
            </h1>
            <p className='text-sm text-gray-500 font-lato'>
              Redirecting you to your orders…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className='w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mx-auto mb-5'>
              ✕
            </div>
            <h1 className='font-montserrat font-black text-xl text-[#0A1F44] mb-2'>
              Something went wrong
            </h1>
            <p className='text-sm text-gray-500 font-lato mb-6'>
              {errorMessage}
            </p>
            <Link
              href='/checkout'
              className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-xl transition-colors'
            >
              Back to Checkout
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function CheckoutCompletePage() {
  return (
    <Suspense fallback={<div className='min-h-screen bg-[#F2F4F7]' />}>
      <CompleteInner />
    </Suspense>
  )
}
