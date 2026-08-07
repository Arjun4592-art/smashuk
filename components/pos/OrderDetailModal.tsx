'use client'
import { useState, useEffect } from 'react'
import { CURRENCY_SYMBOL, SITE_NAME } from '@/lib/constants'

const fmt = (n: number) =>
  CURRENCY_SYMBOL + Math.round(n).toLocaleString('en-GB')

const PAY_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  split: 'Split payment',
}

// Same rule the Orders list uses: a Store Pickup order is still "awaiting
// pickup" (not truly Fulfilled) until Medusa's fulfillment_status reaches
// fulfilled/delivered/partially_delivered.
const isAwaitingPickup = (order: OrderDetailData) =>
  !!order.isPickup &&
  !['fulfilled', 'delivered', 'partially_delivered'].includes(
    order.fulfillmentStatus ?? '',
  )

export interface OrderDetailData {
  id: string
  // BUG FIX: `id` here is actually the display code (e.g. "SR-20") shown
  // in the UI, NOT Medusa's real order ID/UUID — see toOrderDetail() in
  // app/pos/terminal/orders/page.tsx. Calling the fulfill API with `id`
  // hit `/api/pos/orders/SR-20`, which isn't a valid Medusa order ID, so
  // Medusa returned an empty/invalid response and `res.json()` crashed
  // with "Unexpected end of JSON input". ReturnModal.tsx already avoided
  // this by using `medusaOrderId` for its API call — this field lets
  // this modal do the same.
  medusaOrderId?: string
  items: {
    id: string
    name: string
    brand?: string
    price: number
    quantity: number
  }[]
  customer: { name: string; phone?: string } | null
  subtotal: number
  discountTotal: number
  tax: number
  total: number
  paymentMethod: string
  splitPayments?: { method: string; amount: number }[] | null
  note?: string
  cashier: string
  completedAt: string
  returned: boolean
  // Set when this order is a Store Pickup that hasn't been handed over
  // yet — lets the modal show "Awaiting Pickup" instead of always
  // defaulting to "Fulfilled", and hides the Return/exchange action since
  // nothing's actually been handed over for a return to make sense of.
  isPickup?: boolean
  fulfillmentStatus?: string
}

interface Props {
  order: OrderDetailData
  onClose: () => void
  onReturn: () => void
  onFulfill?: () => void
}

export default function OrderDetailModal({
  order,
  onClose,
  onReturn,
  onFulfill,
}: Props) {
  const [showMore, setShowMore] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [fulfilling, setFulfilling] = useState(false)
  const [fulfillError, setFulfillError] = useState('')

  const handleFulfill = async () => {
    setFulfilling(true)
    setFulfillError('')
    try {
      const action = order.isPickup ? 'pickup' : 'dispatch'
      const res = await fetch(
        `/api/pos/orders/${order.medusaOrderId ?? order.id}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      // Fulfillment itself succeeded even if this is set — but Medusa's
      // own "delivered/picked up" state didn't update, so don't close the
      // modal silently. Staff needs to know so they can retry or fix it
      // manually in the Medusa admin (this is exactly the "still shows
      // Awaiting Pickup in Medusa" bug).
      if (data.deliverError) {
        setFulfillError(
          `Order fulfilled, but Medusa wasn't marked delivered: ${data.deliverError}. Try again, or check the order in Medusa admin.`,
        )
        onFulfill?.()
        return
      }
      onFulfill?.()
      onClose()
    } catch (err: unknown) {
      setFulfillError(
        err instanceof Error ? err.message : 'Failed to update order',
      )
    } finally {
      setFulfilling(false)
    }
  }

  // Show the fulfill button only when not yet fulfilled/delivered
  const canFulfill =
    !order.returned &&
    (order.isPickup
      ? order.fulfillmentStatus !== 'delivered' &&
        order.fulfillmentStatus !== 'partially_delivered'
      : order.fulfillmentStatus === 'not_fulfilled' ||
        order.fulfillmentStatus === 'requires_action' ||
        !order.fulfillmentStatus)

  useEffect(() => {
    // Locking document.body alone does nothing here — the Orders list
    // scrolls inside its own `#pos-orders-scroll-area` container, not on
    // <body>. Lock that container directly (in addition to body, so this
    // still behaves correctly on pages that DO scroll via body).
    const scrollEl = document.getElementById('pos-orders-scroll-area')
    const prevBodyOverflow = document.body.style.overflow
    const prevElOverflow = scrollEl?.style.overflow ?? ''

    document.body.style.overflow = 'hidden'
    if (scrollEl) scrollEl.style.overflow = 'hidden'

    const t = setTimeout(() => setMounted(true), 10)
    return () => {
      document.body.style.overflow = prevBodyOverflow
      if (scrollEl) scrollEl.style.overflow = prevElOverflow
      clearTimeout(t)
    }
  }, [])

  const date = new Date(order.completedAt)
  const dateStr = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const timeStr = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const handlePrint = () => window.print()

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 z-50'
        style={{
          background: 'rgba(0,0,0,0.4)',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
        onClick={onClose}
      />

      {/* Mobile/iPad: bottom sheet | Laptop: center modal */}
      <div
        className='fixed z-50 inset-x-0 bottom-0 lg:inset-0 lg:flex lg:items-center lg:justify-center lg:p-6'
        style={{ pointerEvents: 'none' }}
      >
        <div
          className='order-detail-panel pointer-events-auto bg-white overflow-hidden flex flex-col'
          style={{
            transform: mounted ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.28s ease-out',
          }}
        >
          <style>{`
            .order-detail-panel {
              width: 100%;
              max-height: min(88vh, calc(100vh - 32px));
              border-radius: 16px 16px 0 0;
            }
            @media (min-width: 1024px) {
              .order-detail-panel {
                width: 720px;
                border-radius: 16px;
                transform: none !important;
                max-height: min(85vh, calc(100vh - 48px));
              }
            }
            .order-detail-actions {
              padding: 12px !important;
              padding-bottom: max(16px, env(safe-area-inset-bottom, 16px)) !important;
            }
          `}</style>

          {/* Drag handle (mobile) */}
          <div className='flex justify-center pt-2.5 pb-1 lg:hidden'>
            <div
              className='w-10 h-1 rounded-full'
              style={{ background: '#C7C7CC' }}
            />
          </div>

          {/* Header */}
          <div
            className='flex items-center justify-between px-4 py-3 shrink-0'
            style={{ borderBottom: '1px solid #E1E3E5' }}
          >
            <div className='flex items-center gap-3'>
              <button
                onClick={onClose}
                className='w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F6F6F7]'
                style={{ color: '#202223' }}
              >
                <svg
                  width='18'
                  height='18'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.8'
                  strokeLinecap='round'
                >
                  <line x1='18' y1='6' x2='6' y2='18' />
                  <line x1='6' y1='6' x2='18' y2='18' />
                </svg>
              </button>
              <h3
                className='text-base font-semibold'
                style={{ color: '#202223' }}
              >
                #{order.id}
              </h3>
            </div>
          </div>

          {/* Scrollable body */}
          <div className='overflow-y-auto flex-1'>
            {/* Status tags */}
            <div className='flex flex-wrap gap-2 px-4 pt-3'>
              <span
                className='text-xs font-medium px-2.5 py-1 rounded-full'
                style={{ background: '#E3F1EB', color: '#008060' }}
              >
                Paid
              </span>
              <span
                className='text-xs font-medium px-2.5 py-1 rounded-full'
                style={{
                  background: order.returned
                    ? '#F6F6F7'
                    : isAwaitingPickup(order)
                      ? '#FDF1E7'
                      : '#E3F1EB',
                  color: order.returned
                    ? '#6D7175'
                    : isAwaitingPickup(order)
                      ? '#B95000'
                      : '#008060',
                }}
              >
                {order.returned
                  ? 'Returned'
                  : isAwaitingPickup(order)
                    ? 'Awaiting Pickup'
                    : 'Fulfilled'}
              </span>
              {/* Delivery type — always visible so staff can instantly tell
                  home delivery from store pickup regardless of status */}
              {order.isPickup ? (
                <span
                  className='text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1'
                  style={{ background: '#FFF4E4', color: '#946200' }}
                >
                  🏬 Store Pickup
                </span>
              ) : (
                <span
                  className='text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1'
                  style={{ background: '#EEF2FF', color: '#3B5BDB' }}
                >
                  🚚 Home Delivery
                </span>
              )}
            </div>

            {/* Two columns on desktop: Items/Payment left, Customer/Staff/Timeline right */}
            <div className='lg:grid lg:grid-cols-2 lg:gap-x-5 lg:items-start pb-4'>
              <div>
                {/* Items */}
                <div className='px-4 pt-4'>
                  <p
                    className='text-xs font-medium mb-2'
                    style={{ color: '#8C9196' }}
                  >
                    {order.returned
                      ? 'Returned items'
                      : isAwaitingPickup(order)
                        ? `Ready for pickup (${order.items.length})`
                        : `Fulfilled (${order.items.length})`}
                  </p>
                  <div
                    className='rounded-xl overflow-hidden'
                    style={{ border: '1px solid #E1E3E5' }}
                  >
                    {order.items.map((item, i) => (
                      <div
                        key={item.id}
                        className='flex items-center gap-3 px-3 py-3'
                        style={{
                          borderBottom:
                            i < order.items.length - 1
                              ? '1px solid #F6F6F7'
                              : 'none',
                        }}
                      >
                        <div
                          className='w-12 h-12 rounded-lg flex items-center justify-center shrink-0'
                          style={{ background: '#F6F6F7' }}
                        >
                          <svg
                            width='22'
                            height='22'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='#C7C7CC'
                            strokeWidth='1.5'
                          >
                            <path d='M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z' />
                            <line x1='3' y1='6' x2='21' y2='6' />
                            <path d='M16 10a4 4 0 01-8 0' />
                          </svg>
                        </div>
                        <div className='flex-1 min-w-0'>
                          <p
                            className='text-sm font-medium'
                            style={{ color: '#202223' }}
                          >
                            {item.name}
                          </p>
                          {item.brand && (
                            <p
                              className='text-xs mt-0.5'
                              style={{ color: '#8C9196' }}
                            >
                              {item.brand}
                            </p>
                          )}
                          <p
                            className='text-xs mt-0.5'
                            style={{ color: '#8C9196' }}
                          >
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <span
                          className='text-sm font-semibold shrink-0'
                          style={{ color: '#202223' }}
                        >
                          {fmt(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment summary */}
                <div className='px-4 pt-4'>
                  <p
                    className='text-xs font-medium mb-2'
                    style={{ color: '#8C9196' }}
                  >
                    Payment summary
                  </p>
                  <div
                    className='rounded-xl p-3 space-y-2'
                    style={{ border: '1px solid #E1E3E5' }}
                  >
                    <div className='flex justify-between text-sm'>
                      <span style={{ color: '#202223' }}>Total</span>
                      <span
                        className='font-semibold'
                        style={{ color: '#202223' }}
                      >
                        {fmt(order.total)}
                      </span>
                    </div>
                    <div className='flex justify-between text-sm'>
                      <span style={{ color: '#202223' }}>Paid</span>
                      <span
                        className='font-semibold'
                        style={{ color: '#008060' }}
                      >
                        {fmt(order.total)}
                      </span>
                    </div>

                    {!showMore ? (
                      <button
                        onClick={() => setShowMore(true)}
                        className='text-sm font-medium pt-1'
                        style={{ color: '#2C6ECB' }}
                      >
                        Show more
                      </button>
                    ) : (
                      <div
                        className='pt-1 space-y-1.5'
                        style={{ borderTop: '1px solid #F6F6F7' }}
                      >
                        <div
                          className='flex justify-between text-xs'
                          style={{ color: '#6D7175' }}
                        >
                          <span>Subtotal</span>
                          <span>{fmt(order.subtotal)}</span>
                        </div>
                        {order.discountTotal > 0 && (
                          <div
                            className='flex justify-between text-xs'
                            style={{ color: '#008060' }}
                          >
                            <span>Discount</span>
                            <span>-{fmt(order.discountTotal)}</span>
                          </div>
                        )}
                        <div
                          className='flex justify-between text-xs'
                          style={{ color: '#6D7175' }}
                        >
                          <span>VAT (20%)</span>
                          <span>{fmt(order.tax)}</span>
                        </div>
                        <div
                          className='flex justify-between text-xs pt-1'
                          style={{
                            color: '#6D7175',
                            borderTop: '1px solid #F6F6F7',
                          }}
                        >
                          <span>Payment method</span>
                          <span style={{ color: '#202223', fontWeight: 500 }}>
                            {PAY_LABELS[order.paymentMethod] ||
                              order.paymentMethod}
                          </span>
                        </div>
                        {order.paymentMethod === 'split' &&
                          order.splitPayments?.map((s) => (
                            <div
                              key={s.method}
                              className='flex justify-between text-xs'
                              style={{ color: '#8C9196' }}
                            >
                              <span className='pl-3'>
                                {PAY_LABELS[s.method] || s.method}
                              </span>
                              <span>{fmt(s.amount)}</span>
                            </div>
                          ))}
                        <button
                          onClick={() => setShowMore(false)}
                          className='text-sm font-medium pt-1'
                          style={{ color: '#2C6ECB' }}
                        >
                          Show less
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                {/* Customer */}
                <div className='px-4 pt-4'>
                  <p
                    className='text-xs font-medium mb-2'
                    style={{ color: '#8C9196' }}
                  >
                    Customer
                  </p>
                  <div
                    className='rounded-xl p-3'
                    style={{ border: '1px solid #E1E3E5' }}
                  >
                    {order.customer ? (
                      <div className='flex items-center gap-3'>
                        <div
                          className='w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0'
                          style={{ background: '#E3F1EB', color: '#008060' }}
                        >
                          {order.customer.name.charAt(0)}
                        </div>
                        <div>
                          <p
                            className='text-sm font-medium'
                            style={{ color: '#202223' }}
                          >
                            {order.customer.name}
                          </p>
                          {order.customer.phone && (
                            <p className='text-xs' style={{ color: '#8C9196' }}>
                              {order.customer.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className='text-sm' style={{ color: '#8C9196' }}>
                        Walk-in customer
                      </p>
                    )}
                  </div>
                </div>

                {/* Staff */}
                <div className='px-4 pt-4'>
                  <p
                    className='text-xs font-medium mb-2'
                    style={{ color: '#8C9196' }}
                  >
                    Staff
                  </p>
                  <div
                    className='rounded-xl p-3'
                    style={{ border: '1px solid #E1E3E5' }}
                  >
                    <p className='text-xs mb-0.5' style={{ color: '#8C9196' }}>
                      Staff at register
                    </p>
                    <p
                      className='text-sm font-medium'
                      style={{ color: '#202223' }}
                    >
                      {order.cashier}
                    </p>
                  </div>
                </div>

                {/* Note */}
                {order.note && (
                  <div className='px-4 pt-4'>
                    <p
                      className='text-xs font-medium mb-2'
                      style={{ color: '#8C9196' }}
                    >
                      Note
                    </p>
                    <div
                      className='rounded-xl p-3'
                      style={{
                        border: '1px solid #E1E3E5',
                        background: '#FFFBEB',
                      }}
                    >
                      <p className='text-sm' style={{ color: '#B7791F' }}>
                        {order.note}
                      </p>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className='px-4 pt-4'>
                  <p
                    className='text-xs font-medium mb-2'
                    style={{ color: '#8C9196' }}
                  >
                    Timeline
                  </p>
                  <div
                    className='rounded-xl p-3'
                    style={{ border: '1px solid #E1E3E5' }}
                  >
                    <p
                      className='text-sm font-medium'
                      style={{ color: '#202223' }}
                    >
                      Order placed
                    </p>
                    <p className='text-xs mt-0.5' style={{ color: '#8C9196' }}>
                      {dateStr} at {timeStr}
                    </p>
                    <p className='text-xs mt-0.5' style={{ color: '#8C9196' }}>
                      {SITE_NAME}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div
            className='order-detail-actions shrink-0 space-y-2'
            style={{
              borderTop: '1px solid #E1E3E5',
            }}
          >
            {/* Fulfillment action — pickup confirmation or dispatch */}
            {canFulfill && (
              <div className='space-y-1.5'>
                <button
                  onClick={handleFulfill}
                  disabled={fulfilling}
                  className='w-full py-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2'
                  style={{
                    background: order.isPickup ? '#008060' : '#2C6ECB',
                    color: '#FFFFFF',
                  }}
                >
                  {fulfilling ? (
                    <svg
                      className='animate-spin'
                      width='15'
                      height='15'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                    >
                      <path d='M21 12a9 9 0 11-6.219-8.56' />
                    </svg>
                  ) : order.isPickup ? (
                    <svg
                      width='15'
                      height='15'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='1.8'
                      strokeLinecap='round'
                    >
                      <path d='M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z' />
                      <path d='M16 3H8v4h8V3z' />
                    </svg>
                  ) : (
                    <svg
                      width='15'
                      height='15'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='1.8'
                      strokeLinecap='round'
                    >
                      <path d='M5 12h14M12 5l7 7-7 7' />
                    </svg>
                  )}
                  {fulfilling
                    ? 'Updating…'
                    : order.isPickup
                      ? '✓ Confirm Pickup — Hand Over to Customer'
                      : '📦 Mark as Dispatched'}
                </button>
                {fulfillError && (
                  <p
                    className='text-[11.5px] text-center'
                    style={{ color: '#D82C0D' }}
                  >
                    {fulfillError}
                  </p>
                )}
              </div>
            )}

            <div className='flex gap-2'>
              <button
                onClick={handlePrint}
                className='flex-1 min-w-0 py-3 rounded-lg text-sm font-medium border transition-colors hover:bg-[#F6F6F7] flex items-center justify-center gap-2'
                style={{ borderColor: '#E1E3E5', color: '#202223' }}
              >
                <svg
                  width='15'
                  height='15'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.8'
                  strokeLinecap='round'
                  className='shrink-0'
                >
                  <polyline points='6 9 6 2 18 2 18 9' />
                  <path d='M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2' />
                  <rect x='6' y='14' width='12' height='8' />
                </svg>
                <span className='truncate'>Send receipt</span>
              </button>

              {!order.returned && !isAwaitingPickup(order) && !canFulfill && (
                <button
                  onClick={onReturn}
                  className='flex-1 min-w-0 py-3 rounded-lg text-sm font-semibold border transition-colors hover:bg-[#FFF4F4] flex items-center justify-center gap-2'
                  style={{ borderColor: '#D82C0D', color: '#D82C0D' }}
                >
                  <svg
                    width='15'
                    height='15'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.8'
                    strokeLinecap='round'
                    className='shrink-0'
                  >
                    <polyline points='1 4 1 10 7 10' />
                    <path d='M3.51 15a9 9 0 102.13-9.36L1 10' />
                  </svg>
                  <span className='truncate'>Return or exchange</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
