'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/lib/utils'
import {
  CloseIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
  CartIcon,
  TruckIcon,
  ShieldIcon,
  ArrowRightIcon,
} from '@/components/ui/Icons'
import {
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_COST,
} from '@/lib/constants'
interface CartDrawerProps {
  open: boolean
  onClose: () => void
}
export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const {
    items,
    subtotal,
    shipping,
    tax,
    taxRate,
    total,
    removeItem,
    updateQuantity,
  } = useCartStore()
  const drawerRef = useRef<HTMLDivElement>(null)
  const shippingProgress = Math.min(
    (subtotal / FREE_SHIPPING_THRESHOLD) * 100,
    100,
  )
  const amountToFreeShipping = FREE_SHIPPING_THRESHOLD - subtotal
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])
  return (
    <>
      {}
      <div
        className={`fixed inset-0 z-70 bg-[#0A1F44]/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden='true'
      />

      {}
      <div
        ref={drawerRef}
        role='dialog'
        aria-modal='true'
        aria-label='Shopping cart'
        className={`fixed top-0 right-0 bottom-0 z-80 w-full max-w-[420px] bg-[#F2F4F7] flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {}
        <div className='bg-[#0A1F44] px-5 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center'>
                <CartIcon size={17} className='text-white' />
              </div>
              <div>
                <h2 className='font-montserrat font-black text-base text-white leading-none'>
                  Your Cart
                </h2>
                <p className='font-lato text-[11px] text-white/50 mt-0.5'>
                  {items.reduce((s, i) => s + i.quantity, 0)} items
                </p>
              </div>
              {items.length > 0 && (
                <span className='bg-[#E8553A] text-white text-[11px] font-black px-2 py-0.5 rounded-full font-montserrat min-w-[22px] text-center'>
                  {items.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label='Close cart'
              className='w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors'
            >
              <CloseIcon size={16} />
            </button>
          </div>

          {}
          {items.length > 0 && (
            <div className='mt-4'>
              {amountToFreeShipping > 0 ? (
                <p className='text-[11px] text-white/70 font-lato mb-2'>
                  Add{' '}
                  <span className='font-bold text-[#E8553A]'>
                    {formatCurrency(amountToFreeShipping)}
                  </span>{' '}
                  more for free shipping
                </p>
              ) : (
                <p className='text-[11px] text-[#10B981] font-lato mb-2 font-semibold flex items-center gap-1'>
                  <TruckIcon size={12} />
                  You qualify for free shipping!
                </p>
              )}
              <div className='w-full bg-white/10 rounded-full h-1 overflow-hidden'>
                <div
                  className='bg-[#E8553A] h-1 rounded-full transition-all duration-500'
                  style={{
                    width: `${shippingProgress}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {}
        <div className='flex-1 overflow-y-auto px-4 py-4 space-y-3'>
          {items.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-full text-center py-16'>
              <div className='w-24 h-24 bg-white rounded-2xl flex items-center justify-center mb-5 border border-[#E5E7EB]'>
                <CartIcon size={36} className='text-[#D1D5DB]' />
              </div>
              <h3 className='font-montserrat font-black text-lg text-[#0A1F44] mb-2'>
                Your cart is empty
              </h3>
              <p className='text-[#9CA3AF] font-lato text-sm mb-6 max-w-[200px] leading-relaxed'>
                Looks like you haven&apos;t added anything yet
              </p>
              <button
                onClick={onClose}
                className='bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-7 py-3 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-[#E8553A]/20'
              >
                Start Shopping
                <ArrowRightIcon size={15} />
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.product.id}-${item.variant?.id}`}
                className='bg-white rounded-2xl p-3.5 border border-[#E5E7EB] hover:border-[#E8553A]/30 hover:shadow-sm transition-all duration-200'
              >
                <div className='flex gap-3'>
                  {}
                  <div className='w-[72px] h-[72px] rounded-xl overflow-hidden bg-[#F2F4F7] shrink-0 border border-[#E5E7EB]'>
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className='w-full h-full object-cover'
                    />
                  </div>

                  {}
                  <div className='flex-1 min-w-0'>
                    <p className='text-[10px] text-[#E8553A] font-bold font-lato uppercase tracking-wider'>
                      {item.product.brand}
                    </p>
                    <h4 className='font-montserrat font-bold text-[13px] text-[#0A1F44] leading-snug line-clamp-2 mt-0.5'>
                      {item.product.name}
                    </h4>
                    {item.variant && (
                      <p className='text-[11px] text-[#9CA3AF] font-lato mt-0.5'>
                        {item.variant.size}
                        {item.variant.color ? ` · ${item.variant.color}` : ''}
                      </p>
                    )}
                  </div>

                  {}
                  <button
                    onClick={() =>
                      removeItem(item.product.id, item.variant?.id)
                    }
                    aria-label='Remove item'
                    className='w-7 h-7 rounded-lg bg-[#F2F4F7] hover:bg-red-50 hover:text-red-500 text-[#9CA3AF] flex items-center justify-center transition-colors shrink-0'
                  >
                    <TrashIcon size={12} />
                  </button>
                </div>

                {}
                <div className='flex items-center justify-between mt-3 pt-3 border-t border-[#F2F4F7]'>
                  <span className='font-montserrat font-black text-base text-[#0A1F44]'>
                    {formatCurrency(item.product.price * item.quantity)}
                  </span>

                  <div className='flex items-center gap-1 bg-[#F2F4F7] rounded-xl p-1'>
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.product.id,
                          item.quantity - 1,
                          item.variant?.id,
                        )
                      }
                      aria-label='Decrease quantity'
                      className='w-7 h-7 rounded-lg bg-white border border-[#E5E7EB] hover:border-[#E8553A] hover:text-[#E8553A] flex items-center justify-center transition-colors'
                    >
                      <MinusIcon size={11} />
                    </button>
                    <span className='w-8 text-center text-sm font-black font-montserrat text-[#0A1F44]'>
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
                      aria-label='Increase quantity'
                      className='w-7 h-7 rounded-lg bg-white border border-[#E5E7EB] hover:border-[#E8553A] hover:text-[#E8553A] flex items-center justify-center transition-colors'
                    >
                      <PlusIcon size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {}
        {items.length > 0 && (
          <div className='bg-white border-t border-[#E5E7EB] px-5 py-5 space-y-4'>
            {}
            <div className='bg-[#F2F4F7] rounded-2xl px-4 py-3.5 space-y-2'>
              <div className='flex items-center justify-between text-sm font-lato'>
                <span className='text-[#4B5563]'>Subtotal</span>
                <span className='text-[#0A1F44] font-semibold'>
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className='flex items-center justify-between text-sm font-lato'>
                <span className='text-[#4B5563]'>Shipping</span>
                <span
                  className={
                    shipping === 0
                      ? 'text-[#10B981] font-semibold'
                      : 'text-[#0A1F44] font-semibold'
                  }
                >
                  {shipping === 0 ? 'FREE' : formatCurrency(shipping)}
                </span>
              </div>
              <div className='flex items-center justify-between border-t border-[#E5E7EB] pt-2.5'>
                <span className='font-montserrat font-black text-[#0A1F44]'>
                  Total
                </span>
                <span className='font-montserrat font-black text-xl text-[#0A1F44]'>
                  {formatCurrency(total)}
                </span>
              </div>
              <p className='text-[11px] text-[#9CA3AF] font-lato text-right'>
                Including {formatCurrency(tax)} in VAT (
                {Math.round(taxRate * 100)}%)
              </p>
            </div>

            {}
            <div className='flex items-center justify-center gap-1.5 text-[11px] text-[#9CA3AF] font-lato'>
              <ShieldIcon size={12} />
              <span>Secure checkout · 100% authentic products</span>
            </div>

            {}
            <Link
              href='/checkout'
              onClick={onClose}
              className='flex items-center justify-center gap-2 w-full bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-black py-3.5 rounded-xl transition-colors shadow-lg shadow-[#E8553A]/20 hover:-translate-y-0.5 transition-all duration-200'
            >
              Proceed to Checkout
              <ArrowRightIcon size={16} />
            </Link>
            <Link
              href='/cart'
              onClick={onClose}
              className='flex items-center justify-center w-full border border-[#E5E7EB] hover:border-[#0A1F44] text-[#0A1F44] font-montserrat font-semibold py-3 rounded-xl transition-colors text-sm'
            >
              View Full Cart
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
