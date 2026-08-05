'use client'

import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import {
  TrashIcon,
  PlusIcon,
  MinusIcon,
  CartIcon,
  TruckIcon,
  TagIcon,
  ChevronRightIcon,
} from '@/components/ui/Icons'
import { useState, useEffect } from 'react'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/constants'

export default function CartPage() {
  const {
    items,
    subtotal,
    shipping,
    tax,
    taxRate,
    total,
    discountAmount,
    couponCode,
    giftCards,
    giftCardTotal,
    removeItem,
    updateQuantity,
    applyCoupon,
    removeCoupon,
    applyGiftCard,
    removeGiftCard,
  } = useCartStore()

  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState('')
  const [couponSuccess, setCouponSuccess] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)

  const [giftCardInput, setGiftCardInput] = useState('')
  const [giftCardError, setGiftCardError] = useState('')
  const [giftCardLoading, setGiftCardLoading] = useState(false)

  // BUG FIX: this used to always use the hardcoded FREE_SHIPPING_THRESHOLD
  // constant, so changing "Free Shipping Threshold" on the dashboard's
  // Settings > Shipping page had zero effect here — it saved fine but was
  // never actually read. Fetch the real store-configured value, falling
  // back to the constant until it loads (or if the store hasn't set one).
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

  const handleApplyGiftCard = async () => {
    const code = giftCardInput.trim().toUpperCase()
    if (!code) return
    setGiftCardLoading(true)
    setGiftCardError('')
    const result = await applyGiftCard(code)
    setGiftCardLoading(false)
    if (result.success) {
      setGiftCardInput('')
    } else {
      setGiftCardError(result.error ?? 'Invalid gift card code')
    }
  }

  // BUG FIX: this used to be a hardcoded client-side map
  // (`{ APEX10: subtotal * 0.1, FLAT500: 500 }`) — visible to anyone via
  // devtools, never validated against real Medusa promotions, and never
  // actually applied to the real cart, so Stripe/Medusa charged full price
  // regardless of what discount was shown here. applyCoupon now calls the
  // real backend and only succeeds if Medusa genuinely applies the code.
  // BUG FIX: couponSuccess was plain local state, set once on a successful
  // apply and never re-synced with the store afterwards. If the store's
  // `couponCode` ever changes independently (e.g. a dev-mode Fast Refresh
  // re-initializing the persisted cart store, or the coupon being removed
  // elsewhere), this local message was left showing "✓ Coupon applied!"
  // while the UI simultaneously reverted to the un-applied input box —
  // a confusing, self-contradicting state. Keep the message in lockstep
  // with the actual store value instead of trusting it to stay in sync on
  // its own.
  useEffect(() => {
    setCouponSuccess('')
  }, [couponCode])

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    setCouponLoading(true)
    setCouponError('')
    setCouponSuccess('')
    const result = await applyCoupon(code)
    setCouponLoading(false)
    if (result.success) {
      setCouponSuccess(`Coupon "${code}" applied!`)
    } else {
      setCouponError(result.error ?? 'Invalid coupon code')
    }
  }

  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal)

  if (items.length === 0) {
    return (
      <div className='min-h-screen bg-white flex flex-col items-center justify-center py-20 px-4'>
        <div className='w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6'>
          <CartIcon size={40} className='text-gray-300' />
        </div>
        <h1 className='font-montserrat font-black text-3xl text-[#0A1F44] mb-3'>
          Your cart is empty
        </h1>
        <p className='text-gray-400 font-lato mb-8 text-center max-w-sm'>
          Looks like you haven&apos;t added any products yet. Start shopping to
          fill it up!
        </p>
        <Link
          href='/shop'
          className='bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-black px-8 py-3.5 rounded-full transition-colors'
        >
          Start Shopping →
        </Link>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-[#F2F4F7]'>
      {/* Header */}
      <div className='bg-[#0A1F44] py-10'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center gap-2 text-white/60 text-sm font-lato mb-3'>
            <Link href='/' className='hover:text-white'>
              Home
            </Link>
            <ChevronRightIcon size={14} />
            <span className='text-white'>Cart</span>
          </div>
          <h1 className='font-montserrat font-black text-3xl text-white'>
            Shopping Cart
          </h1>
          <p className='text-white/70 font-lato mt-1'>
            {items.reduce((s, i) => s + i.quantity, 0)} items
          </p>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* ── Cart Items ── */}
          <div className='lg:col-span-2 space-y-4'>
            {/* Free shipping progress */}
            {amountToFreeShipping > 0 && (
              <div className='bg-white rounded-2xl p-4 border border-gray-100'>
                <div className='flex items-center gap-2 mb-2'>
                  <TruckIcon size={16} className='text-[#E8553A]' />
                  <p className='text-sm font-lato text-[#0A1F44]'>
                    Add{' '}
                    <span className='font-bold text-[#E8553A]'>
                      {formatCurrency(amountToFreeShipping)}
                    </span>{' '}
                    more to get free shipping!
                  </p>
                </div>
                <div className='w-full bg-gray-100 rounded-full h-2'>
                  <div
                    className='bg-[#E8553A] h-2 rounded-full transition-all duration-500'
                    style={{
                      width: `${Math.min((subtotal / freeShippingThreshold) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {items.map((item) => (
              <div
                key={`${item.product.id}-${item.variant?.id}`}
                className='bg-white rounded-2xl p-5 border border-gray-100 flex gap-4'
              >
                {/* Image */}
                <Link href={`/shop/${item.product.slug}`}>
                  <div className='w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100'>
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className='w-full h-full object-cover hover:scale-105 transition-transform duration-300'
                    />
                  </div>
                </Link>

                {/* Info */}
                <div className='flex-1 min-w-0'>
                  <div className='flex items-start justify-between gap-2'>
                    <div>
                      <p className='text-xs text-[#E8553A] font-semibold font-lato uppercase tracking-wider mb-1'>
                        {item.product.brand}
                      </p>
                      <Link href={`/shop/${item.product.slug}`}>
                        <h3 className='font-montserrat font-bold text-[#0A1F44] text-base hover:text-[#E8553A] transition-colors'>
                          {item.product.name}
                        </h3>
                      </Link>
                      {item.variant && (
                        <p className='text-xs text-gray-400 font-lato mt-1'>
                          {item.variant.size} / {item.variant.color}
                        </p>
                      )}
                      {item.metadata?.service_type === 'stringing' && (
                        <div className='mt-2 inline-flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#B54708] bg-[#FFFAEB] border border-[#FEDF89] rounded-md px-2.5 py-1.5 font-lato'>
                          <span>📅 {item.metadata.booking_date}</span>
                          <span>🕐 {item.metadata.booking_time}</span>
                          {item.metadata.tension_notes && (
                            <span>🧵 {item.metadata.tension_notes}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        removeItem(item.product.id, item.variant?.id)
                      }
                      className='p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0'
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>

                  <div className='flex items-center justify-between mt-4'>
                    {/* Price */}
                    <div>
                      <span className='font-montserrat font-black text-lg text-[#0A1F44]'>
                        {formatCurrency(item.product.price * item.quantity)}
                      </span>
                      {item.quantity > 1 && (
                        <span className='text-xs text-gray-400 font-lato ml-2'>
                          ({formatCurrency(item.product.price)} each)
                        </span>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className='flex items-center border border-gray-200 rounded-xl overflow-hidden'>
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.product.id,
                            item.quantity - 1,
                            item.variant?.id,
                          )
                        }
                        className='w-9 h-9 flex items-center justify-center text-[#0A1F44] hover:bg-gray-50 transition-colors'
                      >
                        <MinusIcon size={14} />
                      </button>
                      <span className='w-10 text-center font-montserrat font-bold text-[#0A1F44] text-sm'>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.product.id,
                            item.quantity + 1,
                            item.variant?.id,
                          )
                        }
                        className='w-9 h-9 flex items-center justify-center text-[#0A1F44] hover:bg-gray-50 transition-colors'
                      >
                        <PlusIcon size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Order Summary ── */}
          <div className='space-y-4'>
            {/* Coupon */}
            <div className='bg-white rounded-2xl p-5 border border-gray-100'>
              <div className='flex items-center gap-2 mb-4'>
                <TagIcon size={16} className='text-[#E8553A]' />
                <h3 className='font-montserrat font-bold text-[#0A1F44]'>
                  Coupon Code
                </h3>
              </div>

              {couponCode ? (
                <div className='flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3'>
                  <div>
                    <p className='font-montserrat font-bold text-green-700 text-sm'>
                      {couponCode}
                    </p>
                    <p className='text-xs text-green-600 font-lato'>
                      -{formatCurrency(discountAmount)} off
                    </p>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className='text-red-400 hover:text-red-600 text-xs font-lato'
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className='flex gap-2'>
                  <input
                    type='text'
                    value={couponInput}
                    onChange={(e) =>
                      setCouponInput(e.target.value.toUpperCase())
                    }
                    placeholder='Enter code'
                    disabled={couponLoading}
                    className='flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato disabled:opacity-60'
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading}
                    className='bg-[#0A1F44] hover:bg-[#E8553A] text-white font-montserrat font-bold px-4 py-2.5 rounded-xl transition-colors text-sm disabled:opacity-60'
                  >
                    {couponLoading ? 'Checking…' : 'Apply'}
                  </button>
                </div>
              )}

              {couponError && (
                <p className='text-xs text-red-500 font-lato mt-2'>
                  {couponError}
                </p>
              )}
              {couponSuccess && (
                <p className='text-xs text-green-600 font-lato mt-2 font-semibold'>
                  ✓ {couponSuccess}
                </p>
              )}

              <p className='text-xs text-gray-400 font-lato mt-3'>
                Try: <span className='font-bold'>APEX10</span> or{' '}
                <span className='font-bold'>FLAT500</span>
              </p>
            </div>

            {/* Gift Card — stacks separately from coupons; multiple codes
                can be applied at once */}
            <div className='bg-white rounded-2xl p-5 border border-gray-100'>
              <div className='flex items-center gap-2 mb-4'>
                <TagIcon size={16} className='text-[#E8553A]' />
                <h3 className='font-montserrat font-bold text-[#0A1F44]'>
                  Gift Card
                </h3>
              </div>

              {giftCards.length > 0 && (
                <div className='space-y-2 mb-3'>
                  {giftCards.map((gc) => (
                    <div
                      key={gc.code}
                      className='flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3'
                    >
                      <div>
                        <p className='font-montserrat font-bold text-green-700 text-sm'>
                          {gc.code}
                        </p>
                        <p className='text-xs text-green-600 font-lato'>
                          -{formatCurrency(gc.amount)} applied
                        </p>
                      </div>
                      <button
                        onClick={() => removeGiftCard(gc.code)}
                        className='text-red-400 hover:text-red-600 text-xs font-lato'
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className='flex gap-2'>
                <input
                  type='text'
                  value={giftCardInput}
                  onChange={(e) =>
                    setGiftCardInput(e.target.value.toUpperCase())
                  }
                  placeholder='Enter gift card code'
                  disabled={giftCardLoading}
                  className='flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato disabled:opacity-60'
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyGiftCard()}
                />
                <button
                  onClick={handleApplyGiftCard}
                  disabled={giftCardLoading}
                  className='bg-[#0A1F44] hover:bg-[#E8553A] text-white font-montserrat font-bold px-4 py-2.5 rounded-xl transition-colors text-sm disabled:opacity-60'
                >
                  {giftCardLoading ? 'Checking…' : 'Apply'}
                </button>
              </div>

              {giftCardError && (
                <p className='text-xs text-red-500 font-lato mt-2'>
                  {giftCardError}
                </p>
              )}
            </div>

            {/* Summary */}
            <div className='bg-white rounded-2xl p-5 border border-gray-100'>
              <h3 className='font-montserrat font-bold text-[#0A1F44] mb-4'>
                Order Summary
              </h3>

              <div className='space-y-3 text-sm font-lato'>
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Subtotal</span>
                  <span className='font-semibold text-[#0A1F44]'>
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className='flex justify-between text-green-600'>
                    <span>Discount ({couponCode})</span>
                    <span className='font-semibold'>
                      -{formatCurrency(discountAmount)}
                    </span>
                  </div>
                )}
                {giftCardTotal > 0 && (
                  <div className='flex justify-between text-green-600'>
                    <span>Gift card</span>
                    <span className='font-semibold'>
                      -{formatCurrency(giftCardTotal)}
                    </span>
                  </div>
                )}
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Shipping</span>
                  <span
                    className={`font-semibold ${
                      shipping === 0 ? 'text-green-600' : 'text-[#0A1F44]'
                    }`}
                  >
                    {shipping === 0 ? 'FREE' : formatCurrency(shipping)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-500'>
                    VAT ({Math.round(taxRate * 100)}%)
                  </span>
                  <span className='font-semibold text-[#0A1F44]'>
                    {formatCurrency(tax)}
                  </span>
                </div>
                <div className='flex justify-between border-t border-gray-100 pt-3 text-base'>
                  <span className='font-montserrat font-black text-[#0A1F44]'>
                    Total
                  </span>
                  <span className='font-montserrat font-black text-[#0A1F44] text-xl'>
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <Link
                href='/checkout'
                className='flex items-center justify-center gap-2 w-full bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-black py-4 rounded-xl transition-colors mt-5 shadow-lg text-base'
              >
                Proceed to Checkout →
              </Link>

              <Link
                href='/shop'
                className='flex items-center justify-center w-full text-sm text-[#0A1F44] hover:text-[#E8553A] font-lato mt-3 transition-colors'
              >
                ← Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
