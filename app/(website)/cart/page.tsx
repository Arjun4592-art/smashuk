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
  ChevronDownIcon,
  ChevronUpIcon,
  ShieldIcon,
} from '@/components/ui/Icons'
import { useState, useEffect, useMemo } from 'react'
import {
  FREE_SHIPPING_THRESHOLD,
  GIFT_CARD_PRODUCT_HANDLE,
} from '@/lib/constants'
import { getProductsByIds, normalizeProduct } from '@/lib/api/store'
import { getRecentlyViewedIds } from '@/lib/recently-viewed'
import ProductCard from '@/components/website/ProductCard'
import type { Product } from '@/types'
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
  const [showEstimator, setShowEstimator] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [orderNote, setOrderNote] = useState('')
  const [estimateCountry, setEstimateCountry] = useState('United Kingdom')
  const [estimatePostcode, setEstimatePostcode] = useState('')
  const [estimateResult, setEstimateResult] = useState<string | null>(null)
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([])
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
      .catch(() => {})
  }, [])
  useEffect(() => {
    const ids = getRecentlyViewedIds().filter(
      (id) => !items.some((i) => i.product.id === id),
    )
    if (ids.length === 0) return
    let cancelled = false
    getProductsByIds(ids)
      .then((raw) => {
        if (cancelled) return
        const byId = new Map(raw.map((p: any) => [p.id, p]))
        const ordered = ids
          .map((id) => byId.get(id))
          .filter(Boolean)
          .slice(0, 4)
          .map(normalizeProduct)
        setRecentlyViewed(ordered)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [items.length])
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
  const physicalItems = items.filter(
    (i) => i.product.slug !== GIFT_CARD_PRODUCT_HANDLE,
  )
  const physicalSubtotal = physicalItems.reduce(
    (s, i) => s + i.product.price * i.quantity,
    0,
  )
  const amountToFreeShipping =
    physicalItems.length === 0
      ? 0
      : Math.max(0, freeShippingThreshold - physicalSubtotal)
  const eligibleForFreeShipping = amountToFreeShipping <= 0
  const totalSaved = useMemo(
    () =>
      items.reduce((sum, i) => {
        if (!i.product.originalPrice) return sum
        return (
          sum +
          Math.max(0, i.product.originalPrice - i.product.price) * i.quantity
        )
      }, 0),
    [items],
  )
  const handleEstimate = () => {
    if (!estimatePostcode.trim()) {
      setEstimateResult('Enter a postcode to estimate shipping.')
      return
    }
    setEstimateResult(
      eligibleForFreeShipping
        ? 'Your order qualifies for free shipping.'
        : `Estimated shipping to ${estimateCountry}: ${formatCurrency(shipping || 4.99)}. Final cost is confirmed at checkout.`,
    )
  }
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
    <div className='min-h-screen bg-white'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10'>
        <h1 className='font-montserrat font-black text-2xl sm:text-3xl text-[#0A1F44]'>
          My cart
        </h1>
        <p className='font-lato text-sm mt-1.5'>
          {eligibleForFreeShipping ? (
            <span className='text-green-600 font-semibold'>
              You are eligible for free shipping!
            </span>
          ) : (
            <span className='text-gray-500'>
              Add{' '}
              <span className='font-bold text-[#E8553A]'>
                {formatCurrency(amountToFreeShipping)}
              </span>{' '}
              more to get free shipping
            </span>
          )}
        </p>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-10 mt-8'>
          {}
          <div className='lg:col-span-2'>
            <div className='hidden sm:grid grid-cols-[1fr_auto_auto] gap-6 pb-3 border-b border-gray-200 text-xs font-montserrat font-bold uppercase tracking-wide text-gray-400'>
              <span>Product</span>
              <span className='w-36 text-center'>Quantity</span>
              <span className='w-24 text-right'>Total</span>
            </div>

            <div className='divide-y divide-gray-100'>
              {items.map((item) => (
                <div
                  key={`${item.product.id}-${item.variant?.id}`}
                  className='grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-4 sm:gap-6 py-6 items-start sm:items-center'
                >
                  {}
                  <div className='flex gap-4'>
                    <Link
                      href={`/shop/${item.product.slug}`}
                      className='shrink-0'
                    >
                      <div className='w-20 h-20 rounded-lg overflow-hidden bg-gray-50 border border-gray-100'>
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className='w-full h-full object-cover'
                        />
                      </div>
                    </Link>
                    <div className='min-w-0'>
                      <p className='text-[11px] text-gray-400 font-lato uppercase tracking-wider mb-0.5'>
                        {item.product.brand}
                      </p>
                      <Link href={`/shop/${item.product.slug}`}>
                        <h3 className='font-montserrat font-bold text-[#0A1F44] text-sm hover:text-[#E8553A] transition-colors leading-snug'>
                          {item.product.name}
                        </h3>
                      </Link>
                      {item.variant &&
                        (item.variant.size || item.variant.color) && (
                          <p className='text-xs text-gray-400 font-lato mt-1'>
                            {[item.variant.size, item.variant.color]
                              .filter(Boolean)
                              .join(' / ')}
                          </p>
                        )}
                      {item.metadata?.string_choice ? (
                        <p className='text-xs text-gray-400 font-lato mt-1'>
                          String Upgrade: {item.metadata.string_choice}
                          {item.metadata.string_tension
                            ? ` · ${item.metadata.string_tension}`
                            : ''}
                        </p>
                      ) : (
                        item.metadata?.string_upgrade && (
                          <p className='text-xs text-gray-400 font-lato mt-1'>
                            String Upgrade: {item.metadata.string_upgrade}
                          </p>
                        )
                      )}
                      {item.metadata?.grip_choice && (
                        <p className='text-xs text-gray-400 font-lato mt-1'>
                          Racket Grip: {item.metadata.grip_choice}
                        </p>
                      )}
                      {item.metadata?.linked_product && (
                        <p className='text-xs text-gray-400 font-lato mt-1'>
                          For: {item.metadata.linked_product}
                        </p>
                      )}
                      {item.discount ? (
                        <p className='text-sm font-lato mt-1.5'>
                          <span className='text-[#E8553A] font-bold'>
                            {formatCurrency(item.product.price - item.discount)}
                          </span>{' '}
                          <span className='text-gray-400 line-through'>
                            {formatCurrency(item.product.price)}
                          </span>
                        </p>
                      ) : item.product.originalPrice &&
                        item.product.originalPrice > item.product.price ? (
                        <p className='text-sm font-lato mt-1.5'>
                          <span className='text-[#E8553A] font-bold'>
                            {formatCurrency(item.product.price)}
                          </span>{' '}
                          <span className='text-gray-400 line-through'>
                            {formatCurrency(item.product.originalPrice)}
                          </span>
                        </p>
                      ) : (
                        <p className='text-sm font-lato text-gray-500 mt-1.5 sm:hidden'>
                          {formatCurrency(item.product.price)}
                        </p>
                      )}
                      <button
                        onClick={() =>
                          removeItem(item.product.id, item.variant?.id)
                        }
                        className='inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 font-lato mt-2 transition-colors'
                      >
                        <TrashIcon size={12} /> Remove
                      </button>
                    </div>
                  </div>

                  {}
                  <div className='flex sm:justify-center'>
                    <div className='flex items-center border border-gray-200 rounded-lg overflow-hidden'>
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

                  {}
                  <div className='sm:w-24 sm:text-right'>
                    <span className='font-montserrat font-black text-[#0A1F44] text-base'>
                      {formatCurrency(
                        (item.product.price - (item.discount ?? 0)) *
                          item.quantity,
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {}
            <div className='mt-8 border border-gray-200 rounded-xl'>
              <button
                onClick={() => setShowEstimator((v) => !v)}
                className='w-full flex items-center justify-between px-5 py-4'
              >
                <span className='flex items-center gap-2 font-montserrat font-bold text-[#0A1F44] text-sm'>
                  <TruckIcon size={16} className='text-[#E8553A]' />
                  Estimate shipping
                </span>
                {showEstimator ? (
                  <ChevronUpIcon size={16} className='text-gray-400' />
                ) : (
                  <ChevronDownIcon size={16} className='text-gray-400' />
                )}
              </button>
              {showEstimator && (
                <div className='px-5 pb-5 grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3'>
                  <div>
                    <label className='text-xs font-lato text-gray-500 mb-1 block'>
                      Country
                    </label>
                    <select
                      value={estimateCountry}
                      onChange={(e) => setEstimateCountry(e.target.value)}
                      className='w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-lato outline-none focus:border-[#E8553A]'
                    >
                      <option>United Kingdom</option>
                      <option>Ireland</option>
                      <option>France</option>
                      <option>Germany</option>
                    </select>
                  </div>
                  <div>
                    <label className='text-xs font-lato text-gray-500 mb-1 block'>
                      Province
                    </label>
                    <select className='w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-lato outline-none focus:border-[#E8553A]'>
                      <option>England</option>
                      <option>Scotland</option>
                      <option>Wales</option>
                      <option>Northern Ireland</option>
                    </select>
                  </div>
                  <div>
                    <label className='text-xs font-lato text-gray-500 mb-1 block'>
                      Postcode
                    </label>
                    <input
                      type='text'
                      value={estimatePostcode}
                      onChange={(e) => setEstimatePostcode(e.target.value)}
                      placeholder='e.g. M1 1AE'
                      className='w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-lato outline-none focus:border-[#E8553A]'
                    />
                  </div>
                  <div className='flex items-end'>
                    <button
                      onClick={handleEstimate}
                      className='w-full sm:w-auto bg-[#0A1F44] hover:bg-[#E8553A] text-white font-montserrat font-bold px-5 py-2.5 rounded-lg transition-colors text-sm whitespace-nowrap'
                    >
                      Estimate
                    </button>
                  </div>
                  {estimateResult && (
                    <p className='sm:col-span-4 text-xs font-lato text-gray-500 mt-1'>
                      {estimateResult}
                    </p>
                  )}
                </div>
              )}
            </div>

            {}
            <div className='mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='border border-gray-200 rounded-xl p-4'>
                <div className='flex items-center gap-2 mb-3'>
                  <TagIcon size={14} className='text-[#E8553A]' />
                  <h3 className='font-montserrat font-bold text-[#0A1F44] text-sm'>
                    Coupon code
                  </h3>
                </div>
                {couponCode ? (
                  <div className='flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2.5'>
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
                      className='flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato disabled:opacity-60'
                      onKeyDown={(e) =>
                        e.key === 'Enter' && handleApplyCoupon()
                      }
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading}
                      className='bg-[#0A1F44] hover:bg-[#E8553A] text-white font-montserrat font-bold px-4 py-2.5 rounded-lg transition-colors text-sm disabled:opacity-60 shrink-0'
                    >
                      {couponLoading ? '…' : 'Apply'}
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
                <p className='text-[11px] text-gray-400 font-lato mt-2'>
                  Try: <span className='font-bold'>APEX10</span> or{' '}
                  <span className='font-bold'>FLAT500</span>
                </p>
              </div>

              <div className='border border-gray-200 rounded-xl p-4'>
                <div className='flex items-center gap-2 mb-3'>
                  <TagIcon size={14} className='text-[#E8553A]' />
                  <h3 className='font-montserrat font-bold text-[#0A1F44] text-sm'>
                    Gift card
                  </h3>
                </div>
                {giftCards.length > 0 && (
                  <div className='space-y-2 mb-2'>
                    {giftCards.map((gc) => (
                      <div
                        key={gc.code}
                        className='flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2.5'
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
                    className='flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#E8553A] transition-colors font-lato disabled:opacity-60'
                    onKeyDown={(e) =>
                      e.key === 'Enter' && handleApplyGiftCard()
                    }
                  />
                  <button
                    onClick={handleApplyGiftCard}
                    disabled={giftCardLoading}
                    className='bg-[#0A1F44] hover:bg-[#E8553A] text-white font-montserrat font-bold px-4 py-2.5 rounded-lg transition-colors text-sm disabled:opacity-60 shrink-0'
                  >
                    {giftCardLoading ? '…' : 'Apply'}
                  </button>
                </div>
                {giftCardError && (
                  <p className='text-xs text-red-500 font-lato mt-2'>
                    {giftCardError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {}
          <div>
            <div className='border border-gray-200 rounded-xl p-5 sticky top-6'>
              {}
              <div className='space-y-2 text-sm font-lato'>
                <div className='flex justify-between text-gray-600'>
                  <span>Subtotal</span>
                  <span className='font-medium text-[#0A1F44]'>
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className='flex justify-between text-gray-600'>
                  <span>Shipping</span>
                  <span className='font-medium text-[#0A1F44]'>
                    {shipping > 0 ? formatCurrency(shipping) : 'Free'}
                  </span>
                </div>
                <div className='flex justify-between text-gray-600'>
                  <span>VAT ({Math.round(taxRate * 100)}%)</span>
                  <span className='font-medium text-[#0A1F44]'>
                    {formatCurrency(tax)}
                  </span>
                </div>
              </div>

              <div className='flex items-baseline justify-between border-t border-gray-100 mt-3 pt-3'>
                <span className='font-montserrat font-bold text-[#0A1F44]'>
                  Total
                </span>
                <span className='font-montserrat font-black text-2xl text-[#0A1F44]'>
                  {formatCurrency(total)}
                  <span className='text-xs font-lato font-normal text-gray-400 ml-1'>
                    GBP
                  </span>
                </span>
              </div>

              {totalSaved > 0 && (
                <p className='text-sm font-lato font-bold text-[#E8553A] mt-1'>
                  You saved {formatCurrency(totalSaved)}!
                </p>
              )}

              {discountAmount > 0 && (
                <div className='flex justify-between text-sm font-lato text-green-600 mt-3'>
                  <span>Discount ({couponCode})</span>
                  <span className='font-semibold'>
                    -{formatCurrency(discountAmount)}
                  </span>
                </div>
              )}
              {giftCardTotal > 0 && (
                <div className='flex justify-between text-sm font-lato text-green-600 mt-1'>
                  <span>Gift card</span>
                  <span className='font-semibold'>
                    -{formatCurrency(giftCardTotal)}
                  </span>
                </div>
              )}

              {}
              <div className='border-t border-gray-100 mt-4 pt-4'>
                <button
                  onClick={() => setShowInstructions((v) => !v)}
                  className='w-full flex items-center justify-between'
                >
                  <span className='font-lato text-sm text-[#0A1F44]'>
                    Order instructions
                  </span>
                  {showInstructions ? (
                    <ChevronUpIcon size={14} className='text-gray-400' />
                  ) : (
                    <ChevronDownIcon size={14} className='text-gray-400' />
                  )}
                </button>
                {showInstructions && (
                  <textarea
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder='Add any notes about your order (e.g. delivery instructions)'
                    rows={3}
                    className='w-full mt-3 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-lato outline-none focus:border-[#E8553A] resize-none'
                  />
                )}
              </div>

              <p className='text-xs text-gray-400 font-lato mt-4'>
                Tax included.{' '}
                <Link
                  href='/shipping'
                  className='underline hover:text-[#E8553A]'
                >
                  Shipping
                </Link>{' '}
                calculated at checkout.
              </p>

              <Link
                href='/checkout'
                className='flex items-center justify-center gap-2 w-full bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-black py-3.5 rounded-xl transition-colors mt-4 text-base'
              >
                Checkout
              </Link>

              <Link
                href='/shop'
                className='flex items-center justify-center w-full text-sm text-[#0A1F44] hover:text-[#E8553A] font-lato mt-3 transition-colors'
              >
                ← Continue shopping
              </Link>

              <div className='flex items-center justify-center gap-1.5 text-xs text-gray-400 font-lato mt-5'>
                <ShieldIcon size={13} />
                100% Secure Payments
              </div>
            </div>
          </div>
        </div>

        {}
        {recentlyViewed.length > 0 && (
          <div className='mt-16'>
            <h2 className='font-montserrat font-black text-xl text-[#0A1F44] mb-5'>
              Recently viewed
            </h2>
            <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5'>
              {recentlyViewed.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
