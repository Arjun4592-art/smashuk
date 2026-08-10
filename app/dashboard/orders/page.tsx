'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { useOrders } from '@/hooks/useDashboard'
import { updateOrderStatus } from '@/lib/api/dashboard'

// ── Types & constants ─────────────────────────────────────────────────────────

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

const SOURCE_ICONS: Record<string, string> = {
  website: '🌐',
  pos: '🖥️',
  dashboard: '⚙️',
}

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website',
  pos: 'POS',
  dashboard: 'Dashboard',
}

const ALL_STATUSES = [
  'All',
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
  'Refunded',
]

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

// ── Stat card icons ───────────────────────────────────────────────────────────
const RevenueStatIcon = () => (
  <svg
    width='18'
    height='18'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.5'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' />
  </svg>
)
const OrdersStatIcon = () => (
  <svg
    width='18'
    height='18'
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
)
const PendingStatIcon = () => (
  <svg
    width='18'
    height='18'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.5'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <circle cx='12' cy='12' r='10' />
    <polyline points='12 6 12 12 16 14' />
  </svg>
)
const AvgOrderStatIcon = () => (
  <svg
    width='18'
    height='18'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.5'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <line x1='18' y1='20' x2='18' y2='10' />
    <line x1='12' y1='20' x2='12' y2='4' />
    <line x1='6' y1='20' x2='6' y2='14' />
  </svg>
)

// ── Icons ─────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg
    width='13'
    height='13'
    viewBox='0 0 24 24'
    fill='none'
    stroke='#8C9196'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <circle cx='11' cy='11' r='8' />
    <line x1='21' y1='21' x2='16.65' y2='16.65' />
  </svg>
)

// ── Main content ──────────────────────────────────────────────────────────────

function OrdersPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const statusParam = searchParams.get('status')
  const view =
    statusParam === 'draft'
      ? 'draft'
      : statusParam === 'abandoned'
        ? 'abandoned'
        : 'all'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const pageSize = 10

  // BUG FIX: this used to hardcode limit: 100 with no offset ever used, so
  // once a store passed 100 orders the header count, revenue/avg-order
  // stats, and older orders themselves were all silently wrong (capped,
  // not paginated). 500 covers realistic order volume for this store size;
  // `count` (the real server-side total) is used for the header text and
  // to show an explicit "showing latest N of X" note if it's ever exceeded,
  // instead of quietly pretending the fetched batch is everything.
  const { data, loading, error, refetch } = useOrders({ limit: 500 })
  const orders = data?.orders ?? []
  const totalOrderCount = data?.count ?? orders.length
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // BUG FIX: the Drafts tab used to hardcode count: 0 no matter what.
  // Medusa only exposes draft orders once the draft-order plugin is
  // installed on the backend, so this fetches the real count and also
  // tracks whether that endpoint is available at all — see
  // app/api/admin/draft-orders/route.ts.
  const [draftCount, setDraftCount] = useState(0)
  const [draftsAvailable, setDraftsAvailable] = useState(true)
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/draft-orders?limit=1', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return
        setDraftCount(d.count ?? 0)
        setDraftsAvailable(d.available !== false)
      })
      .catch(() => {
        if (!cancelled) setDraftsAvailable(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = orders.filter((o: any) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase())
    const matchStatus =
      statusFilter === 'All' || o.status === statusFilter.toLowerCase()
    return matchSearch && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  const toggleAll = () =>
    setSelectedIds(
      selectedIds.length === paginated.length
        ? []
        : paginated.map((o: any) => o.id),
    )

  // BUG FIX: "Mark Delivered" / "Mark Cancelled" / "Export" in the bulk
  // actions bar used to be plain <button>s with no onClick at all —
  // clicking them did nothing. Wired to the same updateOrderStatus API the
  // order detail page uses (sequential, not Promise.all, for the same
  // reason inventory's bulk adjust is sequential — gentler on the backend
  // and lets us report real per-order success/failure instead of
  // all-or-nothing) and to the same CSV export pattern used elsewhere in
  // the dashboard.
  const handleBulkStatusChange = async (action: 'deliver' | 'cancel') => {
    if (selectedIds.length === 0) return
    setBulkActionLoading(true)
    let successCount = 0
    let failCount = 0
    for (const id of selectedIds) {
      try {
        await updateOrderStatus(id, action)
        successCount++
      } catch {
        failCount++
      }
    }
    setBulkActionLoading(false)
    setSelectedIds([])
    await refetch()
    const verb = action === 'deliver' ? 'delivered' : 'cancelled'
    if (failCount === 0) {
      toast.success(`Marked ${successCount} order${successCount !== 1 ? 's' : ''} as ${verb}`)
    } else {
      toast.error(`${successCount} updated, ${failCount} failed — check those orders individually`)
    }
  }

  const handleBulkExport = () => {
    const rows = orders
      .filter((o: any) => selectedIds.includes(o.id))
      .map((o: any) => ({
        Order: o.orderNumber,
        Customer: o.customer,
        Date: o.date,
        Amount: o.amount,
        Status: o.status,
        'Payment Status': o.paymentStatus,
        'Payment Method': o.paymentMethod,
        Source: o.source,
      }))
    if (rows.length === 0) {
      toast.error('Nothing to export')
      return
    }
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} order${rows.length !== 1 ? 's' : ''}`)
  }

  const totalRevenue = orders.reduce(
    (s: number, o: any) =>
      s +
      (o.paymentStatus === 'captured' || o.paymentStatus === 'partially_captured'
        ? o.amount
        : 0),
    0,
  )
  const pendingCount = orders.filter((o: any) => o.status === 'pending').length

  function setTab(tab: string) {
    setSearch('')
    setSelectedIds([])
    setPage(1)
    if (tab === 'all') router.push('/dashboard/orders')
    else router.push(`/dashboard/orders?status=${tab}`)
  }

  const TABS = [
    { id: 'all', label: 'All Orders', count: totalOrderCount },
    { id: 'draft', label: 'Drafts', count: draftCount },
    // Abandoned checkouts aren't a native Medusa concept — Medusa doesn't
    // track incomplete carts as a first-class "abandoned checkout" entity
    // the way Shopify does, so there's no real endpoint to pull this
    // count from yet. Left at 0 deliberately rather than faking a number;
    // the panel below says so explicitly instead of implying it's live.
    { id: 'abandoned', label: 'Abandoned Checkouts', count: 0 },
  ]

  const STATS = [
    {
      label: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      color: 'text-[#008060]',
      bg: 'bg-[#008060]/10',
      icon: <RevenueStatIcon />,
    },
    {
      label: 'Total Orders',
      value: orders.length,
      color: 'text-[#2C6ECB]',
      bg: 'bg-[#2C6ECB]/10',
      icon: <OrdersStatIcon />,
    },
    {
      label: 'Pending Orders',
      value: pendingCount,
      color: 'text-[#916A00]',
      bg: 'bg-[#FFC453]/20',
      icon: <PendingStatIcon />,
    },
    {
      label: 'Avg Order Value',
      value: orders.length ? formatCurrency(totalRevenue / orders.length) : '—',
      color: 'text-[#202223]',
      bg: 'bg-[#F6F6F7]',
      icon: <AvgOrderStatIcon />,
    },
  ]

  return (
    <div className='space-y-5'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-sora text-[22px] font-semibold text-[#202223]'>
            Orders
          </h1>
          <p className='text-[13px] text-[#6D7175] mt-0.5'>
            {totalOrderCount} orders total
            {orders.length < totalOrderCount
              ? ` (showing latest ${orders.length})`
              : ''}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Link
            href='/pos'
            title='Opens the POS terminal — that already has a full order-creation flow (product picker, customer lookup, payment)'
            className='flex items-center gap-1.5 px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-medium rounded-lg border-none cursor-pointer transition-colors'
          >
            + Create Order
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 xl:grid-cols-4 gap-4'>
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className='bg-white border border-[#E1E3E5] rounded-xl p-5'
          >
            <div
              className={`w-9 h-9 ${stat.bg} ${stat.color} rounded-lg mb-3 flex items-center justify-center`}
            >
              {stat.icon}
            </div>
            <p className='text-[12.5px] text-[#6D7175] mb-1'>{stat.label}</p>
            <p
              className={`font-sora text-[22px] font-bold leading-tight ${stat.color}`}
            >
              {loading ? '—' : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className='p-4 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-600'>
          ⚠ Failed to load orders: {error}. Check Medusa backend connection.
        </div>
      )}

      {/* Main card */}
      <div className='bg-white border border-[#E1E3E5] rounded-xl overflow-hidden'>
        {/* Tabs */}
        <div className='flex items-center border-b border-[#E1E3E5] px-4 overflow-x-auto scrollbar-none'>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`px-4 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-all bg-transparent border-l-0 border-r-0 border-t-0 cursor-pointer ${view === tab.id ? 'border-b-[#008060] text-[#008060]' : 'border-b-transparent text-[#6D7175] hover:text-[#202223]'}`}
            >
              {tab.label}{' '}
              <span className='ml-1.5 text-[10.5px] text-[#8C9196]'>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {view === 'all' && (
          <>
            {/* Search + filter */}
            <div className='flex items-center gap-3 px-4 py-3 border-b border-[#E1E3E5] flex-wrap'>
              <div className='flex items-center gap-2 flex-1 min-w-50 px-3 py-2 border border-[#E1E3E5] rounded-lg bg-[#F6F6F7] focus-within:border-[#008060] focus-within:bg-white transition-all'>
                <SearchIcon />
                <input
                  type='text'
                  placeholder='Search orders, customers...'
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className='flex-1 bg-transparent text-[13px] text-[#202223] placeholder-[#8C9196] outline-none'
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className='text-[#8C9196] bg-transparent border-none cursor-pointer'
                  >
                    ✕
                  </button>
                )}
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className='px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none cursor-pointer hover:border-[#8C9196] transition-colors'
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Status sub-tabs */}
            <div className='flex items-center border-b border-[#E1E3E5] overflow-x-auto scrollbar-none px-4'>
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatusFilter(s)
                    setPage(1)
                  }}
                  className={`px-3 py-2.5 text-[12.5px] font-medium whitespace-nowrap border-b-2 transition-all bg-transparent border-l-0 border-r-0 border-t-0 cursor-pointer ${statusFilter === s ? 'border-b-[#008060] text-[#008060]' : 'border-b-transparent text-[#6D7175] hover:text-[#202223]'}`}
                >
                  {s}{' '}
                  <span className='ml-1 text-[10.5px] text-[#8C9196]'>
                    {s === 'All'
                      ? orders.length
                      : orders.filter((o: any) => o.status === s.toLowerCase())
                          .length}
                  </span>
                </button>
              ))}
            </div>

            {/* Bulk actions */}
            {selectedIds.length > 0 && (
              <div className='flex items-center gap-3 px-4 py-2.5 bg-[#008060]/8 border-b border-[#008060]/20'>
                <span className='text-[13px] font-medium text-[#008060]'>
                  {selectedIds.length} selected
                </span>
                <div className='flex gap-2'>
                  <button
                    onClick={() => handleBulkStatusChange('deliver')}
                    disabled={bulkActionLoading}
                    className='px-3 py-1.5 text-[12px] border border-[#E1E3E5] text-[#202223] rounded-lg hover:bg-white bg-transparent cursor-pointer disabled:opacity-50'
                  >
                    {bulkActionLoading ? 'Updating…' : 'Mark Delivered'}
                  </button>
                  <button
                    onClick={() => handleBulkStatusChange('cancel')}
                    disabled={bulkActionLoading}
                    className='px-3 py-1.5 text-[12px] border border-[#E1E3E5] text-[#202223] rounded-lg hover:bg-white bg-transparent cursor-pointer disabled:opacity-50'
                  >
                    {bulkActionLoading ? 'Updating…' : 'Mark Cancelled'}
                  </button>
                  <button
                    onClick={handleBulkExport}
                    disabled={bulkActionLoading}
                    className='px-3 py-1.5 text-[12px] border border-[#E1E3E5] text-[#202223] rounded-lg hover:bg-white bg-transparent cursor-pointer disabled:opacity-50'
                  >
                    Export
                  </button>
                </div>
                <button
                  onClick={() => setSelectedIds([])}
                  className='ml-auto text-[#6D7175] bg-transparent border-none cursor-pointer'
                >
                  ✕
                </button>
              </div>
            )}

            {/* Table */}
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-[#E1E3E5] bg-[#F6F6F7]/50'>
                    <th className='w-10 px-4 py-3'>
                      <input
                        type='checkbox'
                        checked={
                          selectedIds.length === paginated.length &&
                          paginated.length > 0
                        }
                        onChange={toggleAll}
                        className='w-4 h-4 rounded accent-[#008060] cursor-pointer'
                      />
                    </th>
                    {[
                      'Order',
                      'Customer',
                      'Date',
                      'Amount',
                      'Status',
                      'Payment',
                      'Source',
                      'Actions',
                    ].map((h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-[12px] font-semibold text-[#6D7175] uppercase tracking-wide ${i === 7 ? 'text-right' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className='divide-y divide-[#F1F1F1]'>
                  {loading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i} className='animate-pulse'>
                        <td className='px-4 py-3'>
                          <div className='w-4 h-4 bg-[#E1E3E5] rounded' />
                        </td>
                        <td className='px-4 py-3'>
                          <div className='w-24 h-3 bg-[#E1E3E5] rounded' />
                        </td>
                        <td className='px-4 py-3'>
                          <div className='w-28 h-3 bg-[#E1E3E5] rounded' />
                        </td>
                        <td className='px-4 py-3'>
                          <div className='w-20 h-3 bg-[#E1E3E5] rounded' />
                        </td>
                        <td className='px-4 py-3'>
                          <div className='w-16 h-3 bg-[#E1E3E5] rounded' />
                        </td>
                        <td className='px-4 py-3'>
                          <div className='w-16 h-5 bg-[#E1E3E5] rounded-full' />
                        </td>
                        <td className='px-4 py-3'>
                          <div className='w-12 h-5 bg-[#E1E3E5] rounded-full' />
                        </td>
                        <td className='px-4 py-3'>
                          <div className='w-6 h-6 bg-[#E1E3E5] rounded' />
                        </td>
                        <td className='px-4 py-3'>
                          <div className='w-16 h-6 bg-[#E1E3E5] rounded ml-auto' />
                        </td>
                      </tr>
                    ))
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={9} className='px-4 py-16 text-center'>
                        <p className='text-[14px] font-medium text-[#202223]'>
                          No orders found
                        </p>
                        <p className='text-[13px] text-[#6D7175]'>
                          Try adjusting your filters
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((order: any) => (
                      <tr
                        key={order.id}
                        className={`hover:bg-[#F6F6F7] transition-colors ${selectedIds.includes(order.id) ? 'bg-[#F2F7F5]' : ''}`}
                      >
                        <td className='px-4 py-3'>
                          <input
                            type='checkbox'
                            checked={selectedIds.includes(order.id)}
                            onChange={() => toggleSelect(order.id)}
                            className='w-4 h-4 rounded accent-[#008060] cursor-pointer'
                          />
                        </td>
                        <td className='px-4 py-3'>
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            className='text-[13px] font-semibold text-[#2C6ECB] hover:text-[#1a4f9e] no-underline'
                          >
                            {order.orderNumber}
                          </Link>
                          <p className='text-[11px] text-[#8C9196]'>
                            {order.items} item{order.items > 1 ? 's' : ''}
                          </p>
                        </td>
                        <td className='px-4 py-3'>
                          <div className='flex items-center gap-2.5'>
                            <div className='w-7 h-7 rounded-full bg-[#008060]/10 flex items-center justify-center text-[#008060] text-[11px] font-bold shrink-0'>
                              {order.customer.charAt(0)}
                            </div>
                            <div className='min-w-0'>
                              <p className='text-[13px] font-medium text-[#202223] truncate'>
                                {order.customer}
                              </p>
                              <p className='text-[11px] text-[#8C9196]'>
                                {order.city}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className='px-4 py-3'>
                          <span className='text-[12.5px] text-[#6D7175]'>
                            {order.date}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <span className='text-[13px] font-semibold text-[#202223]'>
                            {formatCurrency(order.amount)}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${ORDER_STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-600'}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium capitalize ${PAYMENT_STATUS_STYLES[order.paymentStatus] ?? 'bg-gray-100 text-gray-600'}`}
                          >
                            {order.paymentStatus}
                          </span>
                          <p className='text-[10.5px] text-[#8C9196] mt-0.5'>
                            {order.paymentMethod}
                          </p>
                        </td>
                        <td className='px-4 py-3'>
                          <span className='inline-flex items-center gap-1.5 text-[12.5px] text-[#202223]' title={order.source}>
                            <span>{SOURCE_ICONS[order.source] ?? '🌐'}</span>
                            <span>{SOURCE_LABELS[order.source] ?? 'Website'}</span>
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <div className='flex items-center justify-end gap-1'>
                            <Link
                              href={`/dashboard/orders/${order.id}`}
                              className='w-7 h-7 flex items-center justify-center text-[#6D7175] hover:text-[#202223] hover:bg-[#F6F6F7] rounded-lg no-underline transition-all'
                            >
                              <svg
                                width='14'
                                height='14'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                              >
                                <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
                                <circle cx='12' cy='12' r='3' />
                              </svg>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className='flex items-center justify-between px-4 py-3 border-t border-[#E1E3E5]'>
              <p className='text-[12.5px] text-[#6D7175]'>
                Showing{' '}
                <span className='font-medium text-[#202223]'>
                  {Math.min((page - 1) * pageSize + 1, filtered.length)}–
                  {Math.min(page * pageSize, filtered.length)}
                </span>{' '}
                of{' '}
                <span className='font-medium text-[#202223]'>
                  {filtered.length}
                </span>
              </p>
              <div className='flex items-center gap-1'>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className='px-3 py-1.5 border border-[#E1E3E5] rounded-lg text-[12.5px] text-[#6D7175] bg-white cursor-pointer hover:bg-[#F6F6F7] disabled:opacity-40 transition-colors'
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium cursor-pointer transition-colors ${page === i + 1 ? 'bg-[#008060] text-white border-none' : 'border border-[#E1E3E5] text-[#6D7175] bg-white hover:bg-[#F6F6F7]'}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className='px-3 py-1.5 border border-[#E1E3E5] rounded-lg text-[12.5px] text-[#6D7175] bg-white cursor-pointer hover:bg-[#F6F6F7] disabled:opacity-40 transition-colors'
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}

        {view === 'draft' && (
          <div className='px-5 py-16 text-center'>
            <p className='text-[14px] font-medium text-[#202223]'>
              Draft Orders
            </p>
            <p className='text-[13px] text-[#6D7175] mt-1'>
              {draftsAvailable
                ? draftCount > 0
                  ? `${draftCount} draft order${draftCount > 1 ? 's' : ''} on the Medusa backend — full draft management UI coming soon.`
                  : 'No draft orders yet.'
                : "This Medusa backend doesn't have the draft-order plugin installed, so drafts can't be shown here yet."}
            </p>
          </div>
        )}

        {view === 'abandoned' && (
          <div className='px-5 py-16 text-center'>
            <p className='text-[14px] font-medium text-[#202223]'>
              Abandoned Checkouts
            </p>
            <p className='text-[13px] text-[#6D7175] mt-1'>
              Medusa doesn't track incomplete carts as abandoned checkouts
              out of the box — this needs a custom cart-tracking workflow
              before it can show real data.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className='space-y-5 animate-pulse'>
          <div className='h-8 w-40 bg-[#E1E3E5] rounded-lg' />
          <div className='h-125 bg-[#E1E3E5] rounded-xl' />
        </div>
      }
    >
      <OrdersPageContent />
    </Suspense>
  )
}
