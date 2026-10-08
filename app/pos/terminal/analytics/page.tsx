'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePOSStore } from '@/store/posStore'
import { useAuthStore } from '@/store/authStore'
import { POSAnalyticsSkeleton } from '@/components/ui/Skeleton'
import { fetchPOSOrdersSince, type PosOrderRecord } from '@/lib/api/pos'
import DateRangeFilter, { toLocalYMD } from '@/components/ui/DateRangeFilter'
const fmt = (n: number) =>
  '£' +
  n.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
const SOURCE_LABELS: Record<string, string> = {
  pos: 'POS',
  website: 'Website',
  dashboard: 'Dashboard',
}
const payLabel = (m: string) =>
  m === 'card_terminal'
    ? 'Card terminal'
    : m
      ? m.charAt(0).toUpperCase() + m.slice(1)
      : 'Unknown'
const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate())
const parseYMD = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const shortDay = (ymd: string) =>
  parseYMD(ymd).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
type FilterOption = { key: string; label: string; count: number }
const FILTER_LABEL_CLASS = 'text-[11px] font-medium uppercase tracking-wide'
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
export default function AnalyticsPage() {
  const cashDrawer = usePOSStore((s) => s.cashDrawer)
  const authUser = useAuthStore((s) => s.user)
  // Defaults to today (YYYY-MM-DD, shop-local). '' = no limit.
  const [dateFrom, setDateFrom] = useState(() => toLocalYMD(new Date()))
  const [dateTo, setDateTo] = useState(() => toLocalYMD(new Date()))
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [payFilter, setPayFilter] = useState<string>('all')
  const [allCompletedOrders, setAllCompletedOrders] = useState<
    PosOrderRecord[]
  >([])
  const [mounted, setMounted] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const requestId = useRef(0)
  const loadOrders = useCallback(async (fromYMD: string) => {
    const myId = ++requestId.current
    try {
      setLoadError(null)
      setRefreshing(true)
      // Always load back at least 7 days so the weekly chart is complete,
      // and as far back as the chosen range needs. (Before, only the latest
      // 150 orders were ever loaded, whatever the screen said.)
      const from = fromYMD ? parseYMD(fromYMD) : null
      const weekAgo = startOfDay(new Date())
      weekAgo.setDate(weekAgo.getDate() - 6)
      const since = from ? (from < weekAgo ? from : weekAgo) : null
      const orders = await fetchPOSOrdersSince(since)
      if (myId === requestId.current) setAllCompletedOrders(orders)
    } catch (err: unknown) {
      if (myId !== requestId.current) return
      setLoadError(
        err instanceof Error ? err.message : 'Failed to load analytics data',
      )
    } finally {
      if (myId === requestId.current) {
        setMounted(true)
        setRefreshing(false)
      }
    }
  }, [])
  useEffect(() => {
    loadOrders(dateFrom)
  }, [loadOrders, dateFrom])
  if (!mounted) return <POSAnalyticsSkeleton />
  const isAdmin = authUser?.role === 'admin'
  const completedOrders =
    isAdmin || !authUser
      ? allCompletedOrders
      : allCompletedOrders.filter(
          (o) =>
            o.cashier.trim().toLowerCase() ===
            authUser.name.trim().toLowerCase(),
        )
  const bounds = {
    from: dateFrom ? parseYMD(dateFrom) : null,
    to: dateTo
      ? new Date(
          parseYMD(dateTo).getFullYear(),
          parseYMD(dateTo).getMonth(),
          parseYMD(dateTo).getDate() + 1,
        )
      : new Date(
          startOfDay(new Date()).getFullYear(),
          startOfDay(new Date()).getMonth(),
          startOfDay(new Date()).getDate() + 1,
        ),
  }
  const inRange = (o: PosOrderRecord) => {
    const t = new Date(o.completedAt)
    return (!bounds.from || t >= bounds.from) && t < bounds.to
  }
  const matchSource = (o: PosOrderRecord) =>
    sourceFilter === 'all' || o.source === sourceFilter
  const matchPay = (o: PosOrderRecord) =>
    payFilter === 'all' || o.paymentMethod === payFilter
  // Option counts follow the date range and the OTHER filter, so every
  // number equals what you get after picking it.
  const rangeBase = completedOrders.filter(inRange)
  const sourceCounts = new Map<string, number>()
  rangeBase.filter(matchPay).forEach((o) => {
    sourceCounts.set(o.source, (sourceCounts.get(o.source) ?? 0) + 1)
  })
  const payCounts = new Map<string, number>()
  rangeBase.filter(matchSource).forEach((o) => {
    payCounts.set(o.paymentMethod, (payCounts.get(o.paymentMethod) ?? 0) + 1)
  })
  if (sourceFilter !== 'all' && !sourceCounts.has(sourceFilter))
    sourceCounts.set(sourceFilter, 0)
  if (payFilter !== 'all' && !payCounts.has(payFilter))
    payCounts.set(payFilter, 0)
  const sourceOptions: FilterOption[] = [
    {
      key: 'all',
      label: 'All',
      count: rangeBase.filter(matchPay).length,
    },
    ...['website', 'pos', 'dashboard']
      .filter((k) => (sourceCounts.get(k) ?? 0) > 0 || k === sourceFilter)
      .map((k) => ({
        key: k,
        label: SOURCE_LABELS[k] ?? k,
        count: sourceCounts.get(k) ?? 0,
      })),
  ]
  const payOptions: FilterOption[] = [
    {
      key: 'all',
      label: 'All methods',
      count: rangeBase.filter(matchSource).length,
    },
    ...Array.from(payCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => ({ key: k, label: payLabel(k), count: n })),
  ]
  const hasDate = Boolean(dateFrom || dateTo)
  const sourceActive = sourceOptions.find((o) => o.key === sourceFilter)
  const payActive = payOptions.find((o) => o.key === payFilter)
  const hasActive = sourceFilter !== 'all' || payFilter !== 'all' || hasDate
  const rangeOrders = rangeBase.filter(matchSource).filter(matchPay)

  // Returned orders are not sales — keep them out of revenue, averages,
  // product ranking and the payment mix (they are counted under Returns).
  const soldOrders = rangeOrders.filter((o) => !o.returned)
  const rangeRevenue = soldOrders.reduce((s, o) => s + o.total, 0)
  const avgOrder = soldOrders.length > 0 ? rangeRevenue / soldOrders.length : 0
  const returnedCount = rangeOrders.length - soldOrders.length
  const rangeText =
    dateFrom && dateTo
      ? dateFrom === dateTo
        ? shortDay(dateFrom)
        : `${shortDay(dateFrom)} – ${shortDay(dateTo)}`
      : dateFrom
        ? `From ${shortDay(dateFrom)}`
        : dateTo
          ? `Until ${shortDay(dateTo)}`
          : 'All time'
  const productMap = new Map<
    string,
    {
      name: string
      brand: string
      sold: number
      rev: number
    }
  >()
  soldOrders.forEach((o) => {
    o.items.forEach((item) => {
      const existing = productMap.get(item.product.id) ?? {
        name: item.product.name,
        brand: item.product.brand,
        sold: 0,
        rev: 0,
      }
      existing.sold += item.quantity
      existing.rev += item.product.price * item.quantity
      productMap.set(item.product.id, existing)
    })
  })
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 5)
  const payMap = new Map<string, number>()
  soldOrders.forEach((o) => {
    payMap.set(o.paymentMethod, (payMap.get(o.paymentMethod) ?? 0) + 1)
  })
  const totalPay = soldOrders.length || 1
  const payMix = Array.from(payMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count], i) => ({
      label: payLabel(label),
      pct: Math.round((count / totalPay) * 100),
      color: ['#2C6ECB', '#008060', '#FFC453', '#D82C0D', '#8C9196'][i % 5],
    }))
  const last7: {
    day: string
    rev: number
  }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dayStr = d.toDateString()
    const rev = completedOrders
      .filter(matchSource)
      .filter(matchPay)
      .filter(
        (o) => !o.returned && new Date(o.completedAt).toDateString() === dayStr,
      )
      .reduce((s, o) => s + o.total, 0)
    last7.push({
      day: d.toLocaleDateString('en-GB', {
        weekday: 'short',
      }),
      rev,
    })
  }
  const maxRev = Math.max(...last7.map((d) => d.rev), 1)
  const STAT_CARDS = [
    {
      label: 'Revenue',
      value: fmt(rangeRevenue),
      sub: `${soldOrders.length} order${soldOrders.length === 1 ? '' : 's'}`,
      color: '#008060',
    },
    {
      label: 'Avg Order Value',
      value: fmt(avgOrder),
      sub: 'per transaction',
      color: '#2C6ECB',
    },
    {
      label: 'Returns',
      value: String(returnedCount),
      sub: rangeText,
      color: '#D82C0D',
    },
    {
      label: 'Total Orders',
      value: String(rangeOrders.length),
      sub: rangeText,
      color: '#B7791F',
    },
  ]
  return (
    <div className='flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4'>
      <div>
        <h1 className='text-xl font-semibold' style={{ color: '#202223' }}>
          Analytics
        </h1>
        <p className='text-xs mt-0.5' style={{ color: '#8C9196' }}>
          {isAdmin ? 'All staff' : 'Your sales only'}
        </p>
      </div>

      {}
      <div
        className='rounded-xl px-3.5 py-3'
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
                const active = sourceFilter === opt.key
                return (
                  <button
                    key={opt.key}
                    role='tab'
                    aria-selected={active}
                    onClick={() => setSourceFilter(opt.key)}
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
                value={payFilter}
                onChange={(e) => setPayFilter(e.target.value)}
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
            <DateRangeFilter
              from={dateFrom}
              to={dateTo}
              onChange={(f, t) => {
                setDateFrom(f)
                setDateTo(t)
              }}
            />
          </div>
        </div>

        <div
          className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mt-3 pt-3'
          style={{ borderTop: '1px solid #F1F2F3' }}
        >
          <div className='flex flex-wrap items-center gap-1.5'>
            {hasActive ? (
              <>
                <span className='text-xs' style={{ color: '#6D7175' }}>
                  Filters:
                </span>
                {sourceFilter !== 'all' && sourceActive && (
                  <ActiveChip
                    label={`Source: ${sourceActive.label}`}
                    onRemove={() => setSourceFilter('all')}
                  />
                )}
                {payFilter !== 'all' && payActive && (
                  <ActiveChip
                    label={`Payment: ${payActive.label}`}
                    onRemove={() => setPayFilter('all')}
                  />
                )}
                {hasDate && (
                  <ActiveChip
                    label={`Date: ${rangeText}`}
                    onRemove={() => {
                      setDateFrom('')
                      setDateTo('')
                    }}
                  />
                )}
                <button
                  onClick={() => {
                    setSourceFilter('all')
                    setPayFilter('all')
                    setDateFrom('')
                    setDateTo('')
                  }}
                  className='ml-1 text-xs font-medium hover:underline'
                  style={{ color: '#008060' }}
                >
                  Clear all
                </button>
              </>
            ) : (
              <span className='text-xs' style={{ color: '#8C9196' }}>
                No filters applied
              </span>
            )}
          </div>
          <span className='text-xs' style={{ color: '#6D7175' }}>
            <strong style={{ color: '#202223' }}>{soldOrders.length}</strong>{' '}
            order{soldOrders.length === 1 ? '' : 's'} ·{' '}
            <strong style={{ color: '#202223' }}>{fmt(rangeRevenue)}</strong>
            {refreshing ? ' · updating…' : ''}
          </span>
        </div>
      </div>

      {loadError && (
        <div
          className='rounded-lg px-3 py-2 text-xs flex items-center justify-between gap-2'
          style={{
            background: '#FEF3F2',
            color: '#D82C0D',
            border: '1px solid #FDA29B',
          }}
        >
          <span>{loadError}</span>
          <button
            onClick={() => loadOrders(dateFrom)}
            className='font-semibold underline shrink-0'
          >
            Retry
          </button>
        </div>
      )}

      {}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        {STAT_CARDS.map((s) => (
          <div
            key={s.label}
            className='rounded-xl p-4'
            style={{
              background: '#FFFFFF',
              border: '1px solid #E1E3E5',
            }}
          >
            <p
              className='text-[11px] font-medium uppercase tracking-wide mb-1'
              style={{
                color: '#8C9196',
              }}
            >
              {s.label}
            </p>
            <p
              className='text-xl font-bold'
              style={{
                color: s.color,
              }}
            >
              {s.value}
            </p>
            <p
              className='text-[11px] mt-0.5'
              style={{
                color: '#8C9196',
              }}
            >
              {s.sub}
            </p>
          </div>
        ))}
      </div>

      {}
      <div
        className='rounded-xl p-4'
        style={{
          background: '#FFFFFF',
          border: '1px solid #E1E3E5',
        }}
      >
        <p
          className='text-sm font-semibold mb-4'
          style={{
            color: '#202223',
          }}
        >
          Revenue — last 7 days
        </p>
        {completedOrders.length === 0 ? (
          <div
            className='flex items-center justify-center h-28 rounded-lg'
            style={{
              background: '#F6F6F7',
            }}
          >
            <p
              className='text-xs'
              style={{
                color: '#8C9196',
              }}
            >
              No sales data yet — complete a sale to see your chart
            </p>
          </div>
        ) : (
          <div className='flex items-end gap-1.5 h-28'>
            {}
            {last7.map((d) => (
              <div
                key={d.day}
                className='group relative flex-1 flex flex-col items-center gap-1'
              >
                <div
                  className='w-full flex flex-col justify-end'
                  style={{
                    height: '96px',
                  }}
                >
                  {}
                  <div
                    className='pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium shadow-sm z-10'
                    style={{
                      background: '#202223',
                      color: '#FFFFFF',
                    }}
                  >
                    {fmt(d.rev)}
                  </div>
                  <div
                    className='w-full rounded-t-md transition-all duration-500 cursor-default'
                    style={{
                      height: `${Math.max((d.rev / maxRev) * 100, 4)}%`,
                      background:
                        d.day === last7[6].day ? '#008060' : '#B5E4D8',
                    }}
                  />
                </div>
                <span
                  className='text-[10px]'
                  style={{
                    color: '#8C9196',
                  }}
                >
                  {d.day}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        {}
        <div
          className='rounded-xl p-4'
          style={{
            background: '#FFFFFF',
            border: '1px solid #E1E3E5',
          }}
        >
          <p
            className='text-sm font-semibold mb-4'
            style={{
              color: '#202223',
            }}
          >
            Payment Mix
          </p>
          {payMix.length === 0 ? (
            <p
              className='text-xs py-4 text-center'
              style={{
                color: '#8C9196',
              }}
            >
              No payments yet
            </p>
          ) : (
            <div className='space-y-3'>
              {payMix.map((p) => (
                <div key={p.label}>
                  <div
                    className='flex justify-between text-xs mb-1'
                    style={{
                      color: '#6D7175',
                    }}
                  >
                    <span>{p.label}</span>
                    <span>{p.pct}%</span>
                  </div>
                  <div
                    className='h-1.5 rounded-full overflow-hidden'
                    style={{
                      background: '#F6F6F7',
                    }}
                  >
                    <div
                      className='h-full rounded-full'
                      style={{
                        width: `${p.pct}%`,
                        background: p.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {}
        <div
          className='rounded-xl p-4'
          style={{
            background: '#FFFFFF',
            border: '1px solid #E1E3E5',
          }}
        >
          <p
            className='text-sm font-semibold mb-4'
            style={{
              color: '#202223',
            }}
          >
            Cash Drawer
          </p>
          {!cashDrawer ? (
            <p
              className='text-xs py-4 text-center'
              style={{
                color: '#8C9196',
              }}
            >
              Cash drawer not opened
            </p>
          ) : (
            <div className='grid grid-cols-2 gap-3 text-center'>
              {[
                {
                  label: 'Opening',
                  value: fmt(cashDrawer.openingCash),
                },
                {
                  label: 'Movements',
                  value: String(cashDrawer.movements.length),
                },
                {
                  label: 'Status',
                  value: cashDrawer.closedAt ? 'Closed' : 'Open',
                },
                {
                  label: 'Cash In',
                  value: fmt(
                    cashDrawer.movements
                      .filter((m) => m.type === 'in')
                      .reduce((s, m) => s + m.amount, 0),
                  ),
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className='rounded-lg p-2.5'
                  style={{
                    background: '#F6F6F7',
                  }}
                >
                  <p
                    className='text-sm font-semibold'
                    style={{
                      color: '#202223',
                    }}
                  >
                    {s.value}
                  </p>
                  <p
                    className='text-[11px] mt-0.5'
                    style={{
                      color: '#8C9196',
                    }}
                  >
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {}
      <div
        className='rounded-xl overflow-hidden'
        style={{
          background: '#FFFFFF',
          border: '1px solid #E1E3E5',
        }}
      >
        <div
          className='px-4 py-3'
          style={{
            borderBottom: '1px solid #E1E3E5',
          }}
        >
          <p
            className='text-sm font-semibold'
            style={{
              color: '#202223',
            }}
          >
            Top Selling Products
          </p>
        </div>
        {topProducts.length === 0 ? (
          <div className='flex flex-col items-center py-10 gap-2'>
            <p
              className='text-sm'
              style={{
                color: '#8C9196',
              }}
            >
              No sales data yet
            </p>
          </div>
        ) : (
          <table className='w-full'>
            <thead>
              <tr
                style={{
                  background: '#F6F6F7',
                }}
              >
                {['Product', 'Sold', 'Revenue'].map((h) => (
                  <th
                    key={h}
                    className='px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wide'
                    style={{
                      color: '#8C9196',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom:
                      i < topProducts.length - 1 ? '1px solid #F6F6F7' : 'none',
                  }}
                >
                  <td className='px-4 py-2.5'>
                    <p
                      className='text-sm font-medium'
                      style={{
                        color: '#202223',
                      }}
                    >
                      {p.name}
                    </p>
                    <p
                      className='text-[11px]'
                      style={{
                        color: '#8C9196',
                      }}
                    >
                      {p.brand}
                    </p>
                  </td>
                  <td
                    className='px-4 py-2.5 text-sm'
                    style={{
                      color: '#202223',
                    }}
                  >
                    {p.sold}
                  </td>
                  <td
                    className='px-4 py-2.5 text-sm font-semibold'
                    style={{
                      color: '#008060',
                    }}
                  >
                    {fmt(p.rev)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
