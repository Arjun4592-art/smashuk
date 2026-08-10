'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getOrder, updateOrderStatus } from '@/lib/api/dashboard'
// BUG FIX: this page's status badge/timeline/action buttons were built
// entirely around order.status matching a Shopify-style lifecycle
// ('confirmed' | 'processing' | 'shipped' | 'delivered' | ...), but
// getOrder() returns the RAW Medusa order (see lib/api/dashboard.ts —
// only the orders LIST maps through getDisplayOrderStatus(); the single
// getOrder() never did). Medusa's real order.status is only ever
// pending | completed | archived | canceled | requires_action, so none of
// 'confirmed'/'processing'/'shipped'/'delivered' could ever match — the
// timeline always sat at step 0 (or -1) and most of the action buttons
// below (Mark Processing, Mark Shipped, Process Refund) were dead: even
// clicking them sent an action the backend route doesn't recognise.
// getDisplayOrderStatus() is the same bridge function the orders list and
// the website's own order-tracking page already use — using it here too
// makes this page's badge/timeline finally reflect reality, and is what
// makes the new "Dispatch" button below actually show up when an order is
// ready to ship.
import { getDisplayOrderStatus } from '@/lib/order-status'

// ── Types ─────────────────────────────────────────────────────────────────────
const ORDER_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-[#FFC453]/20 text-[#916A00]',
  confirmed: 'bg-[#2C6ECB]/10 text-[#2C6ECB]',
  processing: 'bg-[#2C6ECB]/10 text-[#2C6ECB]',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-[#008060]/10 text-[#008060]',
  cancelled: 'bg-[#D82C0D]/10 text-[#D82C0D]',
  refunded: 'bg-[#6D7175]/10 text-[#6D7175]',
}

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-[#FFC453]/20 text-[#916A00]',
  paid: 'bg-[#008060]/10 text-[#008060]',
  captured: 'bg-[#008060]/10 text-[#008060]',
  failed: 'bg-[#D82C0D]/10 text-[#D82C0D]',
  refunded: 'bg-[#6D7175]/10 text-[#6D7175]',
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icons = {
  back: (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M15 18l-6-6 6-6' />
    </svg>
  ),
  copy: (
    <svg
      width='13'
      height='13'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <rect x='9' y='9' width='13' height='13' rx='2' />
      <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' />
    </svg>
  ),
  user: (
    <svg
      width='15'
      height='15'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
      <circle cx='12' cy='7' r='4' />
    </svg>
  ),
  map: (
    <svg
      width='15'
      height='15'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' />
      <circle cx='12' cy='10' r='3' />
    </svg>
  ),
  package: (
    <svg
      width='15'
      height='15'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' />
      <polyline points='3.27 6.96 12 12.01 20.73 6.96' />
      <line x1='12' y1='22.08' x2='12' y2='12' />
    </svg>
  ),
  payment: (
    <svg
      width='15'
      height='15'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <rect x='1' y='4' width='22' height='16' rx='2' />
      <line x1='1' y1='10' x2='23' y2='10' />
    </svg>
  ),
  truck: (
    <svg
      width='15'
      height='15'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M1 3h15v13H1z' />
      <path d='M16 8h4l3 4v5h-7V8z' />
      <circle cx='5.5' cy='18.5' r='2' />
      <circle cx='18.5' cy='18.5' r='2' />
    </svg>
  ),
  spinner: (
    <svg className='animate-spin w-4 h-4' viewBox='0 0 24 24' fill='none'>
      <circle
        className='opacity-25'
        cx='12'
        cy='12'
        r='10'
        stroke='currentColor'
        strokeWidth='4'
      />
      <path
        className='opacity-75'
        fill='currentColor'
        d='M4 12a8 8 0 0 1 8-8v8H4z'
      />
    </svg>
  ),
  check: (
    <svg
      width='11'
      height='11'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.5'
      strokeLinecap='round'
    >
      <path d='M4 13l5 5L20 6' />
    </svg>
  ),
  timeline: (
    <svg
      width='15'
      height='15'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <line x1='12' y1='2' x2='12' y2='22' />
      <path d='M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' />
    </svg>
  ),
  note: (
    <svg
      width='15'
      height='15'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' />
      <polyline points='14 2 14 8 20 8' />
      <line x1='16' y1='13' x2='8' y2='13' />
      <line x1='16' y1='17' x2='8' y2='17' />
    </svg>
  ),
}

// ── Section Card ──────────────────────────────────────────────────────────────
function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`bg-white border border-[#E1E3E5] rounded-2xl shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}

function CardHeader({
  icon,
  title,
  right,
}: {
  icon?: React.ReactNode
  title: string
  right?: React.ReactNode
}) {
  return (
    <div className='flex items-center justify-between px-5 py-4 border-b border-[#E1E3E5]'>
      <div className='flex items-center gap-2 text-[#6D7175]'>
        {icon}
        <h3 className='font-sora text-[14px] font-semibold text-[#202223]'>
          {title}
        </h3>
      </div>
      {right}
    </div>
  )
}

// ── Status Actions ────────────────────────────────────────────────────────────
// BUG FIX: replaced the old order.status → fixed-action lookup table (see
// note by the getDisplayOrderStatus import above) with logic driven off
// the REAL fields the backend route actually understands:
// fulfillment_status + metadata.fulfillment_type (pickup vs home
// delivery). This is what the dashboard's own order detail page
// (app/dashboard/orders/[id]/page.tsx) does, and is now mirrored here so
// POS staff get the same working Fulfill → Dispatch → Deliver flow for
// home-delivery orders, and Fulfill → Picked Up for in-store pickup sales.
function getOrderActions(
  order: any,
): { label: string; action: string; color: string }[] {
  const displayStatus = getDisplayOrderStatus(order)
  if (['cancelled', 'delivered', 'refunded'].includes(displayStatus)) return []

  const isPickup = order.metadata?.fulfillment_type === 'pickup'
  const isReadyToDispatch =
    order.fulfillment_status === 'fulfilled' ||
    order.fulfillment_status === 'partially_fulfilled'
  const isShipped =
    order.fulfillment_status === 'shipped' ||
    order.fulfillment_status === 'partially_shipped'

  const actions: { label: string; action: string; color: string }[] = []

  if (order.status === 'pending') {
    actions.push({
      label: 'Confirm Order',
      action: 'confirm',
      color: 'bg-[#008060] text-white',
    })
  }
  if (
    !order.fulfillment_status ||
    order.fulfillment_status === 'not_fulfilled' ||
    order.fulfillment_status === 'partially_fulfilled'
  ) {
    actions.push({
      label: 'Mark as Fulfilled',
      action: 'fulfill',
      color: 'bg-[#2C6ECB] text-white',
    })
  }
  // Dispatch only applies to home-delivery orders — a store-pickup order
  // has no courier leg, it goes straight from "ready" to "picked up".
  if (!isPickup && isReadyToDispatch) {
    actions.push({
      label: 'Dispatch Order',
      action: 'ship',
      color: 'bg-purple-600 text-white',
    })
  }
  if ((isPickup && isReadyToDispatch) || isShipped) {
    actions.push({
      label: isPickup ? 'Mark Picked Up' : 'Mark Delivered',
      action: 'deliver',
      color: 'bg-[#008060] text-white',
    })
  }
  actions.push({
    label: 'Cancel',
    action: 'cancel',
    color: 'border border-[#D82C0D] text-[#D82C0D]',
  })

  return actions
}

// ── Timeline steps ────────────────────────────────────────────────────────────
const TIMELINE_STEPS = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
]

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await getOrder(id)
        setOrder(data)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleAction = async (action: string) => {
    setActionLoading(true)
    try {
      await updateOrderStatus(id, action)
      // Refetch order
      const data = await getOrder(id)
      setOrder(data)
    } catch (err: unknown) {
      alert(
        'Action failed: ' +
          (err instanceof Error ? err.message : 'Unknown error'),
      )
    } finally {
      setActionLoading(false)
    }
  }

  const copyId = () => {
    navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // ── Loading skeleton ────────────────────────────────────────────
  if (loading)
    return (
      <div className='space-y-5 animate-pulse max-w-6xl mx-auto'>
        <div className='h-8 w-48 bg-[#E1E3E5] rounded-lg' />
        <div className='grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5'>
          <div className='space-y-5'>
            <div className='h-48 bg-[#E1E3E5] rounded-2xl' />
            <div className='h-64 bg-[#E1E3E5] rounded-2xl' />
          </div>
          <div className='space-y-5'>
            <div className='h-48 bg-[#E1E3E5] rounded-2xl' />
            <div className='h-32 bg-[#E1E3E5] rounded-2xl' />
          </div>
        </div>
      </div>
    )

  if (error)
    return (
      <div className='max-w-6xl mx-auto space-y-4'>
        <Link
          href='/dashboard/orders'
          className='inline-flex items-center gap-2 text-[13px] text-[#6D7175] hover:text-[#202223] no-underline'
        >
          {Icons.back} Back to Orders
        </Link>
        <div className='p-6 bg-red-50 border border-red-200 rounded-2xl text-[13px] text-red-600'>
          Failed to load order: {error}
          <button
            onClick={() => router.refresh()}
            className='ml-3 underline cursor-pointer bg-transparent border-none text-red-600'
          >
            Retry
          </button>
        </div>
      </div>
    )

  if (!order) return null

  // ── Derived values ──────────────────────────────────────────────
  const customer = order.customer
    ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim() ||
      order.email
    : (order.email ?? 'Guest')

  const shippingAddr = order.shipping_address
  const billingAddr = order.billing_address

  const items = order.items ?? []
  const payments = order.payments ?? []
  const shipping = order.shipping_methods ?? []

  const subtotal = items.reduce(
    (s: number, i: any) => s + (i.unit_price ?? 0) * (i.quantity ?? 1),
    0,
  )
  const shippingTotal = order.shipping_total ?? 0
  const taxTotal = order.tax_total ?? 0
  const discountTotal = order.discount_total ?? 0
  const total = order.total ?? 0

  // Derived Shopify-style status (pending/confirmed/processing/shipped/
  // delivered/cancelled/refunded) — order.status/fulfillment_status alone
  // don't map to this lifecycle directly, see getDisplayOrderStatus's own
  // doc comment in lib/order-status.ts.
  const displayStatus = getDisplayOrderStatus(order)
  const isPickup = order.metadata?.fulfillment_type === 'pickup'

  const statusStyle =
    ORDER_STATUS_STYLES[displayStatus] ?? 'bg-gray-100 text-gray-600'
  const payStyle =
    PAYMENT_STATUS_STYLES[order.payment_status] ?? 'bg-gray-100 text-gray-600'
  const actions = getOrderActions(order)

  const timelineIdx = TIMELINE_STEPS.indexOf(displayStatus)

  const displayId = order.display_id ? `AS-${order.display_id}` : id.slice(0, 8)

  return (
    <div className='max-w-6xl mx-auto space-y-5'>
      {/* Header */}
      <div className='flex items-center justify-between flex-wrap gap-3'>
        <div className='flex items-center gap-3'>
          <Link
            href='/dashboard/orders'
            className='w-8 h-8 flex items-center justify-center border border-[#E1E3E5] rounded-xl text-[#6D7175] hover:text-[#202223] hover:bg-white no-underline transition-all bg-white shadow-sm'
          >
            {Icons.back}
          </Link>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='font-sora text-[20px] font-semibold text-[#202223]'>
                Order {displayId}
              </h1>
              <button
                onClick={copyId}
                className='flex items-center gap-1 px-2 py-0.5 bg-[#F6F6F7] hover:bg-[#E1E3E5] border border-[#E1E3E5] rounded-lg text-[11px] text-[#6D7175] transition-colors cursor-pointer'
              >
                {copied ? Icons.check : Icons.copy}
                {copied ? 'Copied!' : 'Copy ID'}
              </button>
            </div>
            <p className='text-[12.5px] text-[#8C9196] mt-0.5'>
              {formatDate(order.created_at)}
            </p>
          </div>
        </div>

        {/* Status badges + actions */}
        <div className='flex items-center gap-2 flex-wrap'>
          <span
            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold capitalize ${statusStyle}`}
          >
            {displayStatus}
          </span>
          {isPickup && (
            <span className='px-3 py-1.5 rounded-full text-[12px] font-semibold bg-[#FFF4E4] text-[#946200]'>
              🏬 Pickup
            </span>
          )}
          <span
            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold capitalize ${payStyle}`}
          >
            {order.payment_status}
          </span>
          {actions.map((act) => (
            <button
              key={act.action}
              onClick={() => handleAction(act.action)}
              disabled={actionLoading}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all cursor-pointer border-none disabled:opacity-50 ${act.color}`}
            >
              {actionLoading ? Icons.spinner : null}
              {act.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <Card className='px-6 py-5'>
        <div className='flex items-center gap-0'>
          {TIMELINE_STEPS.map((step, idx) => {
            const done = idx <= timelineIdx
            const active = idx === timelineIdx
            const cancelled = displayStatus === 'cancelled'
            return (
              <div key={step} className='flex items-center flex-1'>
                <div className='flex flex-col items-center gap-1.5 relative'>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${cancelled ? 'bg-[#D82C0D]/10 text-[#D82C0D]' : done ? 'bg-[#008060] text-white' : 'bg-[#F6F6F7] text-[#C4C8CC]'} ${active ? 'ring-4 ring-[#008060]/20' : ''}`}
                  >
                    {done && !cancelled ? Icons.check : idx + 1}
                  </div>
                  <span
                    className={`text-[10.5px] font-medium capitalize whitespace-nowrap ${done && !cancelled ? 'text-[#008060]' : 'text-[#C4C8CC]'}`}
                  >
                    {step}
                  </span>
                </div>
                {idx < TIMELINE_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 mb-5 rounded-full ${idx < timelineIdx && !cancelled ? 'bg-[#008060]' : 'bg-[#E1E3E5]'}`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </Card>

      <div className='grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5'>
        {/* ── Left column ── */}
        <div className='space-y-5'>
          {/* Order Items */}
          <Card>
            <CardHeader
              icon={Icons.package}
              title={`Items (${items.length})`}
            />
            <div className='divide-y divide-[#F5F5F5]'>
              {items.map((item: any) => {
                const thumb = item.thumbnail ?? item.variant?.product?.thumbnail
                const variantTitle = item.variant?.title
                const price = item.unit_price ?? 0
                const qty = item.quantity ?? 1
                return (
                  <div
                    key={item.id}
                    className='flex items-center gap-4 px-5 py-4'
                  >
                    <div className='w-12 h-12 bg-[#F6F6F7] border border-[#E1E3E5] rounded-xl flex items-center justify-center shrink-0 overflow-hidden'>
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={item.title}
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        <span className='text-xl'>📦</span>
                      )}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-[13px] font-medium text-[#202223] truncate'>
                        {item.title}
                      </p>
                      {variantTitle && (
                        <p className='text-[11.5px] text-[#8C9196] mt-0.5'>
                          {variantTitle}
                        </p>
                      )}
                      <p className='text-[11.5px] text-[#8C9196]'>
                        SKU: {item.variant?.sku ?? '—'}
                      </p>
                      {item.metadata?.service_type === 'stringing' && (
                        <div className='mt-1.5 inline-flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-[#B54708] bg-[#FFFAEB] border border-[#FEDF89] rounded-md px-2 py-1'>
                          <span>📅 {item.metadata.booking_date}</span>
                          <span>🕐 {item.metadata.booking_time}</span>
                          {item.metadata.tension_notes && (
                            <span>🧵 {item.metadata.tension_notes}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className='text-right shrink-0'>
                      <p className='text-[13px] font-semibold text-[#202223]'>
                        {formatCurrency(price)}
                      </p>
                      <p className='text-[11.5px] text-[#8C9196]'>× {qty}</p>
                    </div>
                    <div className='text-right shrink-0 min-w-[80px]'>
                      <p className='text-[13px] font-bold text-[#202223]'>
                        {formatCurrency(price * qty)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Order totals */}
            <div className='px-5 py-4 border-t border-[#E1E3E5] space-y-2.5 bg-[#FAFAFA] rounded-b-2xl'>
              {[
                { label: 'Subtotal', value: subtotal },
                ...(discountTotal > 0
                  ? [
                      {
                        label: 'Discount',
                        value: -discountTotal,
                        red: true,
                      },
                    ]
                  : []),
                { label: 'Shipping', value: shippingTotal },
                { label: 'Tax (VAT)', value: taxTotal },
              ].map((row: any) => (
                <div
                  key={row.label}
                  className='flex items-center justify-between'
                >
                  <span className='text-[12.5px] text-[#6D7175]'>
                    {row.label}
                  </span>
                  <span
                    className={`text-[12.5px] font-medium ${row.red ? 'text-[#008060]' : 'text-[#202223]'}`}
                  >
                    {row.red ? '-' : ''}
                    {formatCurrency(Math.abs(row.value))}
                  </span>
                </div>
              ))}
              <div className='flex items-center justify-between pt-2.5 border-t border-[#E1E3E5]'>
                <span className='text-[14px] font-bold text-[#202223]'>
                  Total
                </span>
                <span className='text-[16px] font-bold text-[#202223]'>
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader icon={Icons.payment} title='Payment' />
            <div className='px-5 py-4 space-y-3'>
              {payments.length === 0 ? (
                <p className='text-[13px] text-[#8C9196]'>No payment info</p>
              ) : (
                payments.map((p: any) => (
                  <div
                    key={p.id}
                    className='flex items-center justify-between p-3.5 bg-[#F8F9FA] border border-[#E1E3E5] rounded-xl'
                  >
                    <div>
                      <p className='text-[13px] font-medium text-[#202223] capitalize'>
                        {p.provider_id?.replace('_', ' ') ?? 'Unknown'}
                      </p>
                      <p className='text-[11.5px] text-[#8C9196] mt-0.5'>
                        {formatDate(p.created_at)}
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='text-[13px] font-bold text-[#202223]'>
                        {formatCurrency(p.amount ?? 0)}
                      </p>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${PAYMENT_STATUS_STYLES[p.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Shipping */}
          <Card>
            <CardHeader icon={Icons.truck} title='Shipping' />
            <div className='px-5 py-4 space-y-3'>
              {shipping.length === 0 ? (
                <p className='text-[13px] text-[#8C9196]'>No shipping method</p>
              ) : (
                shipping.map((s: any) => (
                  <div
                    key={s.id}
                    className='flex items-center justify-between p-3.5 bg-[#F8F9FA] border border-[#E1E3E5] rounded-xl'
                  >
                    <div>
                      <p className='text-[13px] font-medium text-[#202223]'>
                        {s.name ??
                          s.shipping_option?.name ??
                          'Standard Shipping'}
                      </p>
                      {order.metadata?.tracking_number && (
                        <p className='text-[11.5px] text-[#2C6ECB] mt-0.5'>
                          Tracking: {order.metadata.tracking_number}
                        </p>
                      )}
                    </div>
                    <p className='text-[13px] font-semibold text-[#202223]'>
                      {formatCurrency(s.price ?? 0)}
                    </p>
                  </div>
                ))
              )}

              {/* Shipping address */}
              {shippingAddr && (
                <div className='p-3.5 border border-[#E1E3E5] rounded-xl space-y-0.5'>
                  <p className='text-[12px] font-semibold text-[#6D7175] uppercase tracking-wider mb-2'>
                    Ship To
                  </p>
                  <p className='text-[13px] font-medium text-[#202223]'>
                    {shippingAddr.first_name} {shippingAddr.last_name}
                  </p>
                  <p className='text-[12.5px] text-[#6D7175]'>
                    {shippingAddr.address_1}
                    {shippingAddr.address_2
                      ? `, ${shippingAddr.address_2}`
                      : ''}
                  </p>
                  <p className='text-[12.5px] text-[#6D7175]'>
                    {shippingAddr.city}, {shippingAddr.province}{' '}
                    {shippingAddr.postal_code}
                  </p>
                  <p className='text-[12.5px] text-[#6D7175]'>
                    {shippingAddr.country_code?.toUpperCase()}
                  </p>
                  {shippingAddr.phone && (
                    <p className='text-[12.5px] text-[#6D7175]'>
                      📞 {shippingAddr.phone}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Internal Note */}
          <Card>
            <CardHeader icon={Icons.note} title='Internal Note' />
            <div className='px-5 py-4 space-y-3'>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder='Add an internal note about this order...'
                rows={3}
                className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-xl text-[13px] text-[#202223] placeholder-[#C4C8CC] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/10 transition-all resize-none'
              />
              <button
                onClick={async () => {
                  if (!note.trim()) return
                  setSavingNote(true)
                  await new Promise((r) => setTimeout(r, 500))
                  setSavingNote(false)
                  setNote('')
                }}
                disabled={savingNote || !note.trim()}
                className='px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-medium rounded-lg border-none cursor-pointer disabled:opacity-50 transition-colors inline-flex items-center gap-2'
              >
                {savingNote ? Icons.spinner : null}
                Save Note
              </button>
            </div>
          </Card>
        </div>

        {/* ── Right column ── */}
        <div className='space-y-5'>
          {/* Customer */}
          <Card>
            <CardHeader icon={Icons.user} title='Customer' />
            <div className='px-5 py-4 space-y-4'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-full bg-[#008060]/10 flex items-center justify-center text-[#008060] font-bold text-[14px] shrink-0'>
                  {customer.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className='text-[13px] font-semibold text-[#202223]'>
                    {customer}
                  </p>
                  <p className='text-[11.5px] text-[#8C9196]'>{order.email}</p>
                </div>
              </div>
              {order.customer?.phone && (
                <p className='text-[12.5px] text-[#6D7175]'>
                  📞 {order.customer.phone}
                </p>
              )}
              {order.customer?.id && (
                <Link
                  href={`/dashboard/customers?id=${order.customer.id}`}
                  className='inline-flex items-center gap-1.5 text-[12.5px] text-[#2C6ECB] hover:underline no-underline'
                >
                  View customer profile →
                </Link>
              )}
            </div>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader title='Order Summary' />
            <div className='px-5 py-4 space-y-3'>
              {[
                { label: 'Order ID', value: displayId, mono: true },
                { label: 'Created', value: formatDate(order.created_at) },
                { label: 'Status', value: order.status, badge: statusStyle },
                {
                  label: 'Payment',
                  value: order.payment_status,
                  badge: payStyle,
                },
                {
                  label: 'Items',
                  value: `${items.length} item${items.length !== 1 ? 's' : ''}`,
                },
                {
                  label: 'Source',
                  value: order.sales_channel?.name ?? 'Website',
                },
                ...(order.metadata?.source
                  ? [{ label: 'Channel', value: order.metadata.source }]
                  : []),
              ].map((row: any) => (
                <div
                  key={row.label}
                  className='flex items-center justify-between gap-2'
                >
                  <span className='text-[12px] text-[#8C9196] shrink-0'>
                    {row.label}
                  </span>
                  {row.badge ? (
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${row.badge}`}
                    >
                      {row.value}
                    </span>
                  ) : (
                    <span
                      className={`text-[12.5px] font-medium text-[#202223] text-right truncate max-w-[160px] ${row.mono ? 'font-mono text-[11px]' : ''}`}
                    >
                      {row.value}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Billing Address */}
          {billingAddr && (
            <Card>
              <CardHeader icon={Icons.map} title='Billing Address' />
              <div className='px-5 py-4 space-y-0.5'>
                <p className='text-[13px] font-medium text-[#202223]'>
                  {billingAddr.first_name} {billingAddr.last_name}
                </p>
                <p className='text-[12.5px] text-[#6D7175]'>
                  {billingAddr.address_1}
                  {billingAddr.address_2 ? `, ${billingAddr.address_2}` : ''}
                </p>
                <p className='text-[12.5px] text-[#6D7175]'>
                  {billingAddr.city}, {billingAddr.province}{' '}
                  {billingAddr.postal_code}
                </p>
                <p className='text-[12.5px] text-[#6D7175]'>
                  {billingAddr.country_code?.toUpperCase()}
                </p>
              </div>
            </Card>
          )}

          {/* Danger zone */}
          {!['cancelled', 'refunded'].includes(displayStatus) && (
            <Card>
              <CardHeader title='Danger Zone' />
              <div className='px-5 py-4 space-y-2'>
                <button
                  onClick={() => {
                    if (confirm('Cancel this order?')) handleAction('cancel')
                  }}
                  disabled={actionLoading}
                  className='w-full py-2.5 border border-[#D82C0D] text-[#D82C0D] hover:bg-[#D82C0D]/5 text-[13px] font-medium rounded-xl transition-colors cursor-pointer bg-white disabled:opacity-50'
                >
                  Cancel Order
                </button>
                {order.payment_status === 'captured' && (
                  <button
                    onClick={() => {
                      if (confirm('Refund this order?')) handleAction('refund')
                    }}
                    disabled={actionLoading}
                    className='w-full py-2.5 border border-[#6D7175] text-[#6D7175] hover:bg-[#F6F6F7] text-[13px] font-medium rounded-xl transition-colors cursor-pointer bg-white disabled:opacity-50'
                  >
                    Process Refund
                  </button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
