'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import ReturnModal from '@/components/pos/ReturnModal'
import OrderLookupModal from '@/components/pos/OrderLookupModal'
import OrderDetailModal, {
  type OrderDetailData,
} from '@/components/pos/OrderDetailModal'
import { POSOrderRowSkeleton } from '@/components/ui/Skeleton'
import DateRangeFilter, { toLocalYMD } from '@/components/ui/DateRangeFilter'
import { fetchPOSOrderPage, type PosOrderRecord } from '@/lib/api/pos'
const STATUS_STYLE: Record<
  string,
  {
    bg: string
    color: string
  }
> = {
  completed: {
    bg: '#E3F1EB',
    color: '#008060',
  },
  processing: {
    bg: '#FFF3CD',
    color: '#B7791F',
  },
  shipped: {
    bg: '#E8F0FD',
    color: '#2C6ECB',
  },
  awaiting_pickup: {
    bg: '#FDF1E7',
    color: '#B95000',
  },
}
const STATUS_LABEL: Record<string, string> = {
  returned: 'Returned',
  awaiting_pickup: 'Awaiting Pickup',
}
function toOrderDetail(o: PosOrderRecord): OrderDetailData {
  return {
    id: o.id,
    medusaOrderId: o.medusaOrderId,
    items: o.items.map((i) => ({
      id: i.product.id,
      name: i.product.name,
      brand: i.product.brand,
      price: i.product.price,
      quantity: i.quantity,
      variantTitle: i.product.variantTitle,
      thumbnail: i.product.thumbnail ?? null,
    })),
    customer: o.customer
      ? {
          name: o.customer.name,
          phone: o.customer.phone,
          email: o.customer.email,
        }
      : null,
    subtotal: o.subtotal,
    discountTotal: o.discountTotal,
    shippingTotal: o.shippingTotal,
    giftCardTotal: o.giftCardTotal,
    giftCardCode: o.giftCardCode,
    tax: o.tax,
    total: o.total,
    paymentMethod: o.paymentMethod,
    note: o.note,
    cashier: o.cashier,
    completedAt: o.completedAt,
    returned: o.returned,
    isPickup: o.isPickup,
    fulfillmentStatus: o.fulfillmentStatus,
    trackingToken: o.trackingToken,
    shippingAddress: o.shippingAddress,
    splitPayments: o.splitPayments,
  }
}
type SourceKey = 'pos' | 'website' | 'dashboard'
type PayKey =
  | 'cash'
  | 'card'
  | 'card_terminal'
  | 'split'
  | 'klarna'
  | 'link'
  | 'paypal'
  | 'other'
const SOURCE_LABEL: Record<SourceKey, string> = {
  pos: 'POS',
  website: 'Website',
  dashboard: 'Dashboard',
}
const SOURCE_STYLE: Record<SourceKey, { bg: string; color: string }> = {
  pos: { bg: '#E0F2F1', color: '#00695C' },
  website: { bg: '#F1EBFA', color: '#5B3FA8' },
  dashboard: { bg: '#F1F2F3', color: '#6D7175' },
}
const PAY_FILTERS: { key: PayKey; label: string }[] = [
  { key: 'cash', label: 'Cash' },
  { key: 'card', label: 'Card (Stripe)' },
  { key: 'card_terminal', label: 'Card terminal' },
  { key: 'split', label: 'Split' },
  { key: 'klarna', label: 'Klarna' },
  { key: 'link', label: 'Link' },
  { key: 'paypal', label: 'PayPal' },
  { key: 'other', label: 'Other' },
]
// Maps the stored payment method to a filter bucket + a short display label.
// 'card' on a POS sale is the Stripe card reader; on a website order it's an
// online card payment. Website orders always read "From Website (<method>)".
function getPayment(o: PosOrderRecord): { key: PayKey; label: string } {
  const m = (o.paymentMethod || '').toLowerCase()
  const fromWebsite = (o.source ?? 'website') === 'website'
  const tag = (name: string) => (fromWebsite ? `From Website (${name})` : name)
  if (m === 'cash') return { key: 'cash', label: tag('Cash') }
  if (m === 'card_terminal')
    return { key: 'card_terminal', label: tag('Card terminal') }
  if (m === 'split') return { key: 'split', label: tag('Split') }
  if (m === 'card')
    return {
      key: 'card',
      label:
        o.source === 'pos'
          ? 'Card (Stripe)'
          : fromWebsite
            ? tag('Card')
            : 'Card (online)',
    }
  if (m === 'klarna') return { key: 'klarna', label: tag('Klarna') }
  if (m === 'link') return { key: 'link', label: tag('Link') }
  if (m === 'paypal') return { key: 'paypal', label: tag('PayPal') }
  if (!m || m === 'online') return { key: 'other', label: tag('Online') }
  const pretty = m.replace(/_/g, ' ')
  return {
    key: 'other',
    label: tag(pretty.charAt(0).toUpperCase() + pretty.slice(1)),
  }
}
const money = (n: number) =>
  '£' +
  (Number(n) || 0).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
type FilterOption = { key: string; label: string; count: number }

function ChevronDownIcon() {
  return (
    <svg
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <polyline points='6 9 12 15 18 9' />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      width='10'
      height='10'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='3'
      strokeLinecap='round'
      aria-hidden='true'
    >
      <line x1='6' y1='6' x2='18' y2='18' />
      <line x1='18' y1='6' x2='6' y2='18' />
    </svg>
  )
}

const FILTER_LABEL_CLASS = 'text-[11px] font-medium uppercase tracking-wide'

function ActiveChip({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <span
      className='inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-[11px] font-medium'
      style={{
        background: '#E3F1EB',
        color: '#008060',
        border: '1px solid #BFE0D2',
      }}
    >
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className='flex items-center justify-center w-4 h-4 rounded-full transition-colors hover:bg-[#CDE8DC]'
      >
        <CloseIcon />
      </button>
    </span>
  )
}

function FilterBar({
  sourceValue,
  sourceOptions,
  onSource,
  payValue,
  payOptions,
  onPay,
  dateFrom,
  dateTo,
  onDate,
  summary,
}: {
  sourceValue: string
  sourceOptions: FilterOption[]
  onSource: (v: string) => void
  payValue: string
  payOptions: FilterOption[]
  onPay: (v: string) => void
  dateFrom: string
  dateTo: string
  onDate: (from: string, to: string) => void
  summary: React.ReactNode
}) {
  const sourceActive = sourceOptions.find((o) => o.key === sourceValue)
  const payActive = payOptions.find((o) => o.key === payValue)
  const hasDate = Boolean(dateFrom || dateTo)
  const hasActive = sourceValue !== 'all' || payValue !== 'all' || hasDate
  const shortDay = (ymd: string) =>
    new Date(`${ymd}T00:00:00`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })
  const dateChipLabel =
    dateFrom && dateTo
      ? dateFrom === dateTo
        ? shortDay(dateFrom)
        : `${shortDay(dateFrom)} – ${shortDay(dateTo)}`
      : dateFrom
        ? `From ${shortDay(dateFrom)}`
        : dateTo
          ? `Until ${shortDay(dateTo)}`
          : ''
  return (
    <div
      className='rounded-xl mb-3 px-3.5 py-3'
      style={{ background: '#FFFFFF', border: '1px solid #E1E3E5' }}
    >
      <div className='flex flex-wrap items-center gap-x-5 gap-y-2.5'>
        <div className='flex items-center gap-2'>
          <span className={FILTER_LABEL_CLASS} style={{ color: '#8C9196' }}>
            Source
          </span>
          <div
            className='inline-flex p-0.5 rounded-lg'
            style={{ background: '#F1F2F3' }}
            role='tablist'
            aria-label='Order source'
          >
            {sourceOptions.map((opt) => {
              const active = sourceValue === opt.key
              return (
                <button
                  key={opt.key}
                  role='tab'
                  aria-selected={active}
                  onClick={() => onSource(opt.key)}
                  className='flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap'
                  style={{
                    background: active ? '#FFFFFF' : 'transparent',
                    color: active ? '#008060' : '#6D7175',
                    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {opt.label}
                  <span
                    className='text-[10px] px-1.5 rounded-full'
                    style={{
                      background: active ? '#E3F1EB' : '#E1E3E5',
                      color: active ? '#008060' : '#6D7175',
                    }}
                  >
                    {opt.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <span className={FILTER_LABEL_CLASS} style={{ color: '#8C9196' }}>
            Payment
          </span>
          <div className='relative' style={{ color: '#8C9196' }}>
            <select
              value={payValue}
              onChange={(e) => onPay(e.target.value)}
              aria-label='Payment method'
              className='appearance-none pl-3 pr-8 py-1.5 rounded-lg border bg-white text-xs font-medium outline-none cursor-pointer transition-colors hover:border-[#008060] focus:border-[#008060]'
              style={{ borderColor: '#E1E3E5', color: '#202223' }}
            >
              {payOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label} ({opt.count})
                </option>
              ))}
            </select>
            <span className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2'>
              <ChevronDownIcon />
            </span>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <span className={FILTER_LABEL_CLASS} style={{ color: '#8C9196' }}>
            Date
          </span>
          <DateRangeFilter from={dateFrom} to={dateTo} onChange={onDate} />
        </div>
      </div>

      {(hasActive || summary) && (
        <div
          className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mt-3 pt-3'
          style={{ borderTop: '1px solid #F1F2F3' }}
        >
          <div className='flex flex-wrap items-center gap-1.5'>
            {hasActive && (
              <>
                <span className='text-xs' style={{ color: '#6D7175' }}>
                  Filters:
                </span>
                {sourceValue !== 'all' && sourceActive && (
                  <ActiveChip
                    label={`Source: ${sourceActive.label}`}
                    onRemove={() => onSource('all')}
                  />
                )}
                {payValue !== 'all' && payActive && (
                  <ActiveChip
                    label={`Payment: ${payActive.label}`}
                    onRemove={() => onPay('all')}
                  />
                )}
                {hasDate && (
                  <ActiveChip
                    label={`Date: ${dateChipLabel}`}
                    onRemove={() => onDate('', '')}
                  />
                )}
                <button
                  onClick={() => {
                    onSource('all')
                    onPay('all')
                    onDate('', '')
                  }}
                  className='ml-1 text-xs font-medium hover:underline'
                  style={{ color: '#008060' }}
                >
                  Clear all
                </button>
              </>
            )}
          </div>
          {summary && (
            <span className='text-xs' style={{ color: '#6D7175' }}>
              {summary}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
export default function OrdersPage() {
  const authUser = useAuthStore((s) => s.user)
  const [showReturn, setShowReturn] = useState(false)
  const [returnOrderId, setReturnOrderId] = useState<string | undefined>()
  const [showLookup, setShowLookup] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PosOrderRecord | null>(
    null,
  )
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceKey | 'all'>('all')
  const [payFilter, setPayFilter] = useState<PayKey | 'all'>('all')
  // Date range (YYYY-MM-DD, local time). '' = no limit.
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [mounted, setMounted] = useState(false)
  const [completedOrders, setCompletedOrders] = useState<PosOrderRecord[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadOrders = useCallback(async () => {
    try {
      setLoadError(null)
      const { orders, count } = await fetchPOSOrderPage(0)
      setCompletedOrders(orders)
      setTotalCount(count)
    } catch (err: unknown) {
      setLoadError(
        err instanceof Error ? err.message : 'Failed to load order history',
      )
    } finally {
      setMounted(true)
    }
  }, [])
  useEffect(() => {
    loadOrders()
  }, [loadOrders])
  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const { orders, count } = await fetchPOSOrderPage(completedOrders.length)
      setCompletedOrders((prev) => {
        const seen = new Set(prev.map((p) => p.medusaOrderId))
        return [...prev, ...orders.filter((o) => !seen.has(o.medusaOrderId))]
      })
      setTotalCount(count)
    } catch (err: unknown) {
      setLoadError(
        err instanceof Error ? err.message : 'Failed to load more orders',
      )
    } finally {
      setLoadingMore(false)
    }
  }
  const hasMore = completedOrders.length < totalCount
  // ── Filters must see ALL matching orders, not just the first page ──────
  // Orders arrive newest-first in pages. Without this, a date / source /
  // payment filter or a search only looked at the 150 orders already loaded
  // and silently hid everything older. While any filter is active we keep
  // pulling pages in the background — and for a date filter we stop as soon
  // as the oldest loaded order is older than the "from" date.
  const AUTOLOAD_CAP = 3000
  const filtersActive =
    Boolean(search.trim()) ||
    sourceFilter !== 'all' ||
    payFilter !== 'all' ||
    Boolean(dateFrom || dateTo)
  const [autoLoading, setAutoLoading] = useState(false)
  const autoLoadRef = useRef(false)
  const reachedDateStart = (() => {
    if (!dateFrom || search.trim()) return false
    const oldest = completedOrders[completedOrders.length - 1]
    return Boolean(
      oldest && toLocalYMD(new Date(oldest.completedAt)) < dateFrom,
    )
  })()
  const autoLoadDone =
    !hasMore || completedOrders.length >= AUTOLOAD_CAP || reachedDateStart
  useEffect(() => {
    if (!mounted || !filtersActive || loadError) return
    if (autoLoadDone || autoLoadRef.current) return
    autoLoadRef.current = true
    setAutoLoading(true)
    fetchPOSOrderPage(completedOrders.length, 300)
      .then(({ orders, count }) => {
        setCompletedOrders((prev) => {
          const seen = new Set(prev.map((p) => p.medusaOrderId))
          return [...prev, ...orders.filter((o) => !seen.has(o.medusaOrderId))]
        })
        setTotalCount(count)
      })
      .catch((err: unknown) => {
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load more orders',
        )
      })
      .finally(() => {
        autoLoadRef.current = false
        setAutoLoading(false)
      })
  }, [mounted, filtersActive, loadError, autoLoadDone, completedOrders.length])
  const filtersStillLoading = filtersActive && !autoLoadDone
  const isAdmin = authUser?.role === 'admin'
  // Order ID ("SR-35") barely needs any room, but Customer often holds a
  // full email address — give Order ID a small fixed share and Customer
  // the extra space instead of splitting all 6/7 columns equally.
  const ordersGridCols = isAdmin
    ? '0.6fr 1.3fr 0.9fr 0.7fr 0.95fr 0.85fr 0.45fr 0.75fr 0.8fr'
    : '0.6fr 1.5fr 0.7fr 0.95fr 0.85fr 0.45fr 0.75fr 0.8fr'
  const isPendingPickup = (o: PosOrderRecord) =>
    o.isPickup &&
    !['fulfilled', 'delivered', 'partially_delivered'].includes(
      o.fulfillmentStatus,
    )
  const shipOrderStatus = (
    o: PosOrderRecord,
  ): 'completed' | 'shipped' | 'processing' => {
    const fs = o.fulfillmentStatus
    if (['delivered', 'partially_delivered'].includes(fs)) return 'completed'
    if (['shipped', 'partially_shipped'].includes(fs)) return 'shipped'
    return 'processing'
  }
  const allOrders = completedOrders
    .filter(
      (o) =>
        isAdmin ||
        !authUser ||
        isPendingPickup(o) ||
        o.cashier.trim().toLowerCase() === authUser.name.trim().toLowerCase(),
    )
    .map((o) => ({
      id: o.id,
      customer: o.customer?.name || 'Walk-in',
      cashier: o.cashier || '—',
      time:
        new Date(o.completedAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
        }) +
        ', ' +
        new Date(o.completedAt).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      items: o.items.length,
      total: o.total,
      status: isPendingPickup(o)
        ? 'awaiting_pickup'
        : o.returned
          ? 'returned'
          : o.isPickup
            ? 'completed'
            : shipOrderStatus(o),
      isPickup: o.isPickup,
      source: (o.source ?? 'website') as SourceKey,
      payment: getPayment(o),
      live: true,
      raw: o,
    }))
  const matchesDate = (iso: string) => {
    if (!dateFrom && !dateTo) return true
    if (!iso) return false
    const day = toLocalYMD(new Date(iso))
    if (dateFrom && day < dateFrom) return false
    if (dateTo && day > dateTo) return false
    return true
  }
  const matchesSearch = (o: (typeof allOrders)[number]) =>
    !search ||
    o.id.toLowerCase().includes(search.toLowerCase()) ||
    o.customer.toLowerCase().includes(search.toLowerCase()) ||
    o.cashier.toLowerCase().includes(search.toLowerCase()) ||
    o.payment.label.toLowerCase().includes(search.toLowerCase()) ||
    SOURCE_LABEL[o.source].toLowerCase().includes(search.toLowerCase())
  const matchesSource = (o: (typeof allOrders)[number]) =>
    sourceFilter === 'all' || o.source === sourceFilter
  const matchesPay = (o: (typeof allOrders)[number]) =>
    payFilter === 'all' || o.payment.key === payFilter
  const filtered = allOrders.filter(
    (o) =>
      matchesSource(o) &&
      matchesPay(o) &&
      matchesDate(o.raw.completedAt) &&
      matchesSearch(o),
  )
  // Chip counts follow the OTHER active filters (date, search, and the
  // other chip group), so every number matches what the list will show
  // when that chip is picked.
  const forSourceCounts = allOrders.filter(
    (o) => matchesPay(o) && matchesDate(o.raw.completedAt) && matchesSearch(o),
  )
  const forPayCounts = allOrders.filter(
    (o) =>
      matchesSource(o) && matchesDate(o.raw.completedAt) && matchesSearch(o),
  )
  // Only offer "Dashboard" as a source filter when such orders exist.
  const countSource = (k: SourceKey) =>
    forSourceCounts.filter((o) => o.source === k).length
  const sourceOptions: FilterOption[] = [
    { key: 'all', label: 'All', count: forSourceCounts.length },
    { key: 'website', label: 'Website', count: countSource('website') },
    { key: 'pos', label: 'POS', count: countSource('pos') },
    ...(countSource('dashboard') > 0 || sourceFilter === 'dashboard'
      ? [
          {
            key: 'dashboard',
            label: 'Dashboard',
            count: countSource('dashboard'),
          },
        ]
      : []),
  ]
  // Only list payment methods that actually appear in the loaded orders.
  const payOptions: FilterOption[] = [
    { key: 'all', label: 'All methods', count: forPayCounts.length },
    ...PAY_FILTERS.map((f) => ({
      ...f,
      count: forPayCounts.filter((o) => o.payment.key === f.key).length,
    })).filter((f) => f.count > 0 || f.key === payFilter),
  ]
  // Sum of what's currently shown (returned orders left out) — handy for
  // matching the card machine / till totals at end of day.
  const shownTotal = filtered
    .filter((o) => o.status !== 'returned')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const handleRowClick = (o: (typeof allOrders)[number]) => {
    if (o.live && o.raw) setSelectedOrder(o.raw)
  }
  return (
    <>
      <div
        id='pos-orders-scroll-area'
        className='flex-1 min-h-0 overflow-y-auto p-3 sm:p-4'
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}
      >
        {}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3'>
          <h1
            className='text-xl font-semibold'
            style={{
              color: '#202223',
            }}
          >
            Orders
          </h1>

          <div className='flex gap-2'>
            {}
            <div
              className='flex items-center gap-2 px-3 py-2 rounded-lg border bg-white flex-1 sm:w-64'
              style={{
                borderColor: '#E1E3E5',
              }}
            >
              <svg
                width='14'
                height='14'
                viewBox='0 0 24 24'
                fill='none'
                stroke='#8C9196'
                strokeWidth='1.5'
                strokeLinecap='round'
              >
                <circle cx='11' cy='11' r='8' />
                <line x1='21' y1='21' x2='16.65' y2='16.65' />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search orders...'
                className='flex-1 bg-transparent outline-none text-sm'
                style={{
                  color: '#202223',
                }}
              />
            </div>

            {}
            <button
              onClick={() => setShowLookup(true)}
              className='flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors hover:border-[#008060] hover:text-[#008060] whitespace-nowrap'
              style={{
                borderColor: '#E1E3E5',
                color: '#6D7175',
                background: '#FFFFFF',
              }}
            >
              <svg
                width='13'
                height='13'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
              >
                <circle cx='11' cy='11' r='8' />
                <line x1='21' y1='21' x2='16.65' y2='16.65' />
              </svg>
              Look up order
            </button>

            {}
            <button
              onClick={() => setShowReturn(true)}
              className='flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors hover:border-[#008060] hover:text-[#008060] whitespace-nowrap'
              style={{
                borderColor: '#E1E3E5',
                color: '#6D7175',
                background: '#FFFFFF',
              }}
            >
              <svg
                width='13'
                height='13'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
              >
                <polyline points='1 4 1 10 7 10' />
                <path d='M3.51 15a9 9 0 102.13-9.36L1 10' />
              </svg>
              Return
            </button>
          </div>
        </div>

        {}
        <FilterBar
          sourceValue={sourceFilter}
          sourceOptions={sourceOptions}
          onSource={(v) => setSourceFilter(v as SourceKey | 'all')}
          payValue={payFilter}
          payOptions={payOptions}
          onPay={(v) => setPayFilter(v as PayKey | 'all')}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDate={(f, t) => {
            setDateFrom(f)
            setDateTo(t)
          }}
          summary={
            mounted && !loadError ? (
              <>
                <strong style={{ color: '#202223' }}>{filtered.length}</strong>{' '}
                order{filtered.length === 1 ? '' : 's'} ·{' '}
                <strong style={{ color: '#202223' }}>
                  {money(shownTotal)}
                </strong>{' '}
                · loaded {completedOrders.length} of {totalCount}
                {autoLoading || filtersStillLoading
                  ? ' · applying filters…'
                  : ''}
              </>
            ) : null
          }
        />

        {}
        <div
          className='rounded-xl overflow-hidden'
          style={{
            background: '#FFFFFF',
            border: '1px solid #E1E3E5',
          }}
        >
          {}
          <div
            className='hidden sm:grid px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide'
            style={{
              background: '#F6F6F7',
              color: '#8C9196',
              borderBottom: '1px solid #E1E3E5',
              gridTemplateColumns: ordersGridCols,
            }}
          >
            <span>Order ID</span>
            <span>Customer</span>
            {isAdmin && <span>Staff</span>}
            <span>Source</span>
            <span>Payment</span>
            <span>Time</span>
            <span>Items</span>
            <span>Total</span>
            <span>Status</span>
          </div>

          {!mounted ? (
            <div>
              {[...Array(6)].map((_, i) => (
                <POSOrderRowSkeleton key={i} />
              ))}
            </div>
          ) : loadError ? (
            <div className='flex flex-col items-center py-12 gap-2'>
              <p
                className='text-sm'
                style={{
                  color: '#D82C0D',
                }}
              >
                {loadError}
              </p>
              <button
                onClick={loadOrders}
                className='text-xs font-medium px-3 py-1.5 rounded-lg border hover:bg-[#F6F6F7]'
                style={{
                  borderColor: '#E1E3E5',
                  color: '#6D7175',
                }}
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 && filtersStillLoading ? (
            <div className='flex flex-col items-center py-12 gap-2'>
              <p className='text-sm' style={{ color: '#8C9196' }}>
                Searching all orders…
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className='flex flex-col items-center py-12 gap-2'>
              <svg
                width='32'
                height='32'
                viewBox='0 0 24 24'
                fill='none'
                stroke='#E1E3E5'
                strokeWidth='1.5'
              >
                <path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' />
                <polyline points='14 2 14 8 20 8' />
              </svg>
              <p
                className='text-sm'
                style={{
                  color: '#8C9196',
                }}
              >
                No orders found
              </p>
            </div>
          ) : (
            filtered.map((o, i) => {
              const style =
                o.status === 'returned'
                  ? {
                      bg: '#F6F6F7',
                      color: '#6D7175',
                    }
                  : (STATUS_STYLE[o.status] ?? STATUS_STYLE.completed)
              const clickable = o.live
              return (
                <div key={o.id}>
                  {}
                  <div
                    onClick={() => handleRowClick(o)}
                    className='hidden sm:grid px-4 py-3 text-sm items-center transition-colors hover:bg-[#F6F6F7]'
                    style={{
                      borderBottom:
                        i < filtered.length - 1 ? '1px solid #F6F6F7' : 'none',
                      cursor: clickable ? 'pointer' : 'default',
                      gridTemplateColumns: ordersGridCols,
                    }}
                  >
                    <span
                      className='font-medium'
                      style={{
                        color: '#008060',
                      }}
                    >
                      {o.id}
                    </span>
                    <span
                      style={{
                        color: '#202223',
                      }}
                      className='flex items-center gap-1.5 min-w-0'
                    >
                      <span className='truncate'>{o.customer}</span>
                      {o.isPickup && (
                        <span
                          className='text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap'
                          style={{
                            background: '#FDF1E7',
                            color: '#B95000',
                          }}
                        >
                          🏬 Pickup
                        </span>
                      )}
                    </span>
                    {isAdmin && (
                      <span
                        className='truncate min-w-0'
                        style={{
                          color: '#202223',
                        }}
                      >
                        {o.cashier}
                      </span>
                    )}
                    <span>
                      <span
                        className='text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap'
                        style={SOURCE_STYLE[o.source]}
                      >
                        {SOURCE_LABEL[o.source]}
                      </span>
                    </span>
                    <span
                      className='truncate min-w-0 text-[13px]'
                      style={{
                        color: '#202223',
                      }}
                    >
                      {o.payment.label}
                    </span>
                    <span
                      style={{
                        color: '#8C9196',
                        fontSize: 12,
                      }}
                    >
                      {o.time}
                    </span>
                    <span
                      style={{
                        color: '#6D7175',
                      }}
                    >
                      {o.items}
                    </span>
                    <span
                      className='font-medium'
                      style={{
                        color: '#202223',
                      }}
                    >
                      {money(o.total)}
                    </span>
                    <span
                      className='text-[11px] px-2 py-0.5 rounded-full font-medium w-fit'
                      style={style}
                    >
                      {STATUS_LABEL[o.status] ??
                        o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                    </span>
                  </div>

                  {}
                  <div
                    onClick={() => handleRowClick(o)}
                    className='sm:hidden flex flex-col gap-1.5 px-4 py-3 active:bg-[#F6F6F7] transition-colors'
                    style={{
                      borderBottom:
                        i < filtered.length - 1 ? '1px solid #F6F6F7' : 'none',
                      cursor: clickable ? 'pointer' : 'default',
                    }}
                  >
                    <div className='flex justify-between items-center'>
                      <span
                        className='font-medium text-sm'
                        style={{
                          color: '#008060',
                        }}
                      >
                        {o.id}
                      </span>
                      <span
                        className='font-semibold text-sm'
                        style={{
                          color: '#202223',
                        }}
                      >
                        {money(o.total)}
                      </span>
                    </div>
                    <div className='flex justify-between items-center'>
                      <span
                        className='text-xs flex items-center gap-1'
                        style={{
                          color: '#6D7175',
                        }}
                      >
                        {o.customer}
                        {o.isPickup && (
                          <span
                            className='text-[9px] px-1 py-0.5 rounded-full font-medium whitespace-nowrap'
                            style={{
                              background: '#FDF1E7',
                              color: '#B95000',
                            }}
                          >
                            🏬
                          </span>
                        )}
                        {isAdmin ? ` · ${o.cashier}` : ''} ·{' '}
                        {SOURCE_LABEL[o.source]} · {o.payment.label} · {o.items}{' '}
                        items · {o.time}
                      </span>
                      <span
                        className='text-[11px] px-2 py-0.5 rounded-full font-medium'
                        style={style}
                      >
                        {STATUS_LABEL[o.status] ??
                          o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {mounted && !loadError && hasMore && !filtersActive && (
          <div className='flex flex-col items-center gap-1.5 py-4'>
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className='px-4 py-2 rounded-lg text-xs font-medium border transition-colors hover:border-[#008060] hover:text-[#008060] disabled:opacity-50'
              style={{
                borderColor: '#E1E3E5',
                color: '#6D7175',
                background: '#FFFFFF',
              }}
            >
              {loadingMore ? 'Loading…' : 'Load more orders'}
            </button>
            <span className='text-[11px]' style={{ color: '#8C9196' }}>
              Filters and search apply to the {completedOrders.length} loaded
              orders. {totalCount - completedOrders.length} more on the server.
            </span>
          </div>
        )}
      </div>

      {mounted &&
        !loadError &&
        filtersActive &&
        hasMore &&
        autoLoadDone &&
        !reachedDateStart && (
          <p
            className='text-center text-[11px] py-3'
            style={{ color: '#8C9196' }}
          >
            Showing results from the newest {completedOrders.length} orders.
            Narrow the date range to see older ones.
          </p>
        )}

      {}
      {selectedOrder && (
        <OrderDetailModal
          order={toOrderDetail(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          onFulfill={() => {
            setSelectedOrder(null)
            loadOrders()
          }}
          onReturn={() => {
            setReturnOrderId(selectedOrder.id)
            setSelectedOrder(null)
            setShowReturn(true)
          }}
        />
      )}

      {showReturn && (
        <ReturnModal
          orders={completedOrders}
          initialOrderId={returnOrderId}
          onReturned={() => loadOrders()}
          onClose={() => {
            setShowReturn(false)
            setReturnOrderId(undefined)
          }}
        />
      )}
      {showLookup && <OrderLookupModal onClose={() => setShowLookup(false)} />}
    </>
  )
}
