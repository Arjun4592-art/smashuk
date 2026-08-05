'use client'

import { useEffect, useState } from 'react'
import { useInventory } from '@/hooks/useDashboard'
import { toast } from 'sonner'

type InventoryItem = {
  id: string
  name: string
  sku: string
  stock: number
  lowStockThreshold: number
  reserved: number
  incoming: number
  costPrice: number
  lastUpdated: string
  icon: string
  brand: string
  sport: string
}

function getStockStatus(
  stock: number,
  threshold: number,
): 'out' | 'low' | 'ok' {
  if (stock === 0) return 'out'
  if (stock <= threshold) return 'low'
  return 'ok'
}

function StockBar({ stock, threshold }: { stock: number; threshold: number }) {
  const status = getStockStatus(stock, threshold)
  const max = Math.max(stock, threshold * 3, 20)
  const pct = Math.min((stock / max) * 100, 100)
  return (
    <div className='w-24 h-1.5 bg-[#E1E3E5] rounded-full overflow-hidden'>
      <div
        className={`h-full rounded-full transition-all duration-300 ${status === 'out' ? 'bg-[#D82C0D]' : status === 'low' ? 'bg-[#FFC453]' : 'bg-[#008060]'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

const STOCK_FILTERS = ['All', 'In Stock', 'Low Stock', 'Out of Stock']

// ── SVG Icons ─────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg
      width='13'
      height='13'
      viewBox='0 0 24 24'
      fill='none'
      stroke='#8C9196'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <circle cx='11' cy='11' r='7.5' />
      <path d='M18.5 18.5L22 22' />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      width='12'
      height='12'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
    >
      <path d='M18 6L6 18M6 6l12 12' />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
      <polyline points='7 10 12 15 17 10' />
      <line x1='12' y1='15' x2='12' y2='3' />
    </svg>
  )
}

function BulkIcon() {
  return (
    <svg
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M12 4v16M4 12h16' />
    </svg>
  )
}

function AdjustIcon() {
  return (
    <svg
      width='11'
      height='11'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
    >
      <path d='M12 4v16M4 12h16' />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg
      width='13'
      height='13'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
    >
      <path d='M15 18l-6-6 6-6' />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg
      width='13'
      height='13'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
    >
      <path d='M9 18l6-6-6-6' />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='#916A00'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' />
      <path d='M12 9v5M12 17h.01' />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' />
      <path d='M12 9v5M12 17h.01' />
    </svg>
  )
}

function InStockIcon() {
  return (
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
      <path d='M8 12l3 3 5-6' />
    </svg>
  )
}

function LowStockIcon() {
  return (
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
      <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' />
      <path d='M12 9v5M12 17h.01' />
    </svg>
  )
}

function OutStockIcon() {
  return (
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
      <path d='M15 9l-6 6M9 9l6 6' />
    </svg>
  )
}

function ValueIcon() {
  return (
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
}

function EmptyIcon() {
  return (
    <svg
      width='36'
      height='36'
      viewBox='0 0 24 24'
      fill='none'
      stroke='#C4C8CC'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' />
      <polyline points='3.27 6.96 12 12.01 20.73 6.96' />
      <line x1='12' y1='22.08' x2='12' y2='12' />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className='animate-spin w-3.5 h-3.5' viewBox='0 0 24 24' fill='none'>
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
  )
}

// ── Stat Card ─────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  barColor,
  pct,
  loading,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  barColor: string
  pct: number
  loading?: boolean
}) {
  return (
    <div className='bg-white border border-[#E1E3E5] rounded-2xl p-5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200'>
      <div className='flex items-center justify-between mb-3'>
        <div
          className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center ${iconColor} shrink-0`}
        >
          {icon}
        </div>
        <span
          className={`font-sora text-[22px] font-bold ${iconColor} tracking-tight`}
        >
          {loading ? (
            <span className='inline-block w-12 h-6 bg-[#F1F1F1] rounded animate-pulse' />
          ) : (
            value
          )}
        </span>
      </div>
      <p className='text-[12px] text-[#8C9196] mb-2.5 font-medium'>{label}</p>
      <div className='h-1.5 bg-[#E1E3E5] rounded-full overflow-hidden'>
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────

export default function InventoryPage() {
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState('All')
  const [adjustId, setAdjustId] = useState<string | null>(null)
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustType, setAdjustType] = useState<'add' | 'remove' | 'set'>('add')
  const [adjustReason, setAdjustReason] = useState('restock')
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const { data: inventory, loading, error } = useInventory({ limit: 100 })
  const [items, setItems] = useState<InventoryItem[]>([])

  // ── Bulk adjust ──────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkQty, setBulkQty] = useState('')
  const [bulkType, setBulkType] = useState<'add' | 'remove' | 'set'>('add')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: standard data-fetch/derived-state pattern (set loading/derived state synchronously, real work happens async or on next tick); reviewed, not a bug.
    if (inventory) setItems(inventory)
  }, [inventory])

  const filtered = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
    const status = getStockStatus(item.stock, item.lowStockThreshold)
    const matchStock =
      stockFilter === 'All' ||
      (stockFilter === 'In Stock' && status === 'ok') ||
      (stockFilter === 'Low Stock' && status === 'low') ||
      (stockFilter === 'Out of Stock' && status === 'out')
    return matchSearch && matchStock
  })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const outOfStock = items.filter((i) => i.stock === 0).length
  const lowStock = items.filter(
    (i) => i.stock > 0 && i.stock <= i.lowStockThreshold,
  ).length
  const inStock = items.filter((i) => i.stock > i.lowStockThreshold).length
  const totalValue = items.reduce((s, i) => s + i.stock * i.costPrice, 0)

  const adjustItem = items.find((i) => i.id === adjustId)

  const handleAdjust = async () => {
    if (!adjustId || !adjustQty) return
    setSaving(true)

    const qty = parseInt(adjustQty) || 0

    const newStock =
      adjustType === 'add'
        ? Math.max(0, adjustItem!.stock + qty)
        : adjustType === 'remove'
          ? Math.max(0, adjustItem!.stock - qty)
          : qty

    try {
      const res = await fetch('/api/admin/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          variant_id: adjustId,
          quantity: newStock,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Adjust failed')
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === adjustId
            ? { ...item, stock: newStock, lastUpdated: 'Just now' }
            : item,
        ),
      )

      setAdjustId(null)
      setAdjustQty('')
      toast.success('Stock updated successfully!')
    } catch (err: any) {
      toast.error('Failed to adjust stock: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Bulk selection helpers ──────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const allVisibleSelected = paginated.every((i) => prev.has(i.id))
      const next = new Set(prev)
      if (allVisibleSelected) {
        paginated.forEach((i) => next.delete(i.id))
      } else {
        paginated.forEach((i) => next.add(i.id))
      }
      return next
    })
  }

  // ── Bulk adjust ──────────────────────────────────────────────────────────
  const handleBulkAdjust = async () => {
    if (selectedIds.size === 0 || !bulkQty) return
    const qty = parseInt(bulkQty) || 0
    const selectedItems = items.filter((i) => selectedIds.has(i.id))

    setBulkSaving(true)
    setBulkProgress({ done: 0, total: selectedItems.length })

    let successCount = 0
    let failCount = 0
    const updated = new Map<string, number>()

    // Sequential, not Promise.all — Medusa's inventory-item update isn't
    // safe to hammer with dozens of concurrent requests, and sequential
    // also lets us show real progress instead of an all-or-nothing spinner.
    for (const item of selectedItems) {
      const newStock =
        bulkType === 'add'
          ? Math.max(0, item.stock + qty)
          : bulkType === 'remove'
            ? Math.max(0, item.stock - qty)
            : qty

      try {
        const res = await fetch('/api/admin/inventory/adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ variant_id: item.id, quantity: newStock }),
        })
        if (!res.ok) throw new Error()
        updated.set(item.id, newStock)
        successCount++
      } catch {
        failCount++
      }
      setBulkProgress((p) => ({ ...p, done: p.done + 1 }))
    }

    setItems((prev) =>
      prev.map((item) =>
        updated.has(item.id)
          ? { ...item, stock: updated.get(item.id)!, lastUpdated: 'Just now' }
          : item,
      ),
    )

    setBulkSaving(false)
    setBulkModalOpen(false)
    setSelectedIds(new Set())
    setBulkQty('')

    if (failCount === 0) {
      toast.success(`Updated stock for ${successCount} item${successCount !== 1 ? 's' : ''}`)
    } else {
      toast.error(`${successCount} updated, ${failCount} failed — check those items individually`)
    }
  }

  // ── Export CSV ───────────────────────────────────────────────────────────
  const handleExportCsv = () => {
    const rows = filtered.map((i) => ({
      Name: i.name,
      SKU: i.sku,
      Brand: i.brand,
      Sport: i.sport,
      Stock: i.stock,
      'Low Stock Threshold': i.lowStockThreshold,
      Reserved: i.reserved,
      Incoming: i.incoming,
      'Cost Price': i.costPrice,
      'Stock Value': i.stock * i.costPrice,
      'Last Updated': i.lastUpdated,
    }))

    if (rows.length === 0) {
      toast.error('Nothing to export')
      return
    }

    const headers = Object.keys(rows[0])
    const escapeCsv = (val: any) => {
      const s = String(val ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((h) => escapeCsv((row as any)[h])).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} items`)
  }

  return (
    <div className='space-y-5'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-sora text-[22px] font-semibold text-[#202223] tracking-tight'>
            Inventory
          </h1>
          <p className='text-[13px] text-[#8C9196] mt-0.5'>
            Track and manage your product stock levels
          </p>
        </div>
        <div className='flex items-center gap-2.5'>
          <button
            onClick={handleExportCsv}
            className='inline-flex items-center gap-2 px-3.5 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg transition-colors duration-150 cursor-pointer shadow-sm'
          >
            <ExportIcon /> Export CSV
          </button>
          <button
            onClick={() => setBulkModalOpen(true)}
            disabled={selectedIds.size === 0}
            className='inline-flex items-center gap-2 px-4 py-2 bg-[#008060] hover:bg-[#006e52] active:bg-[#005c45] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-medium rounded-lg transition-all duration-150 border-none cursor-pointer shadow-sm shadow-[#008060]/20'
          >
            <BulkIcon /> Bulk Adjust{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 xl:grid-cols-4 gap-4'>
        <StatCard
          label='In Stock'
          value={inStock}
          icon={<InStockIcon />}
          iconBg='bg-[#008060]/8'
          iconColor='text-[#008060]'
          barColor='bg-[#008060]'
          pct={items.length ? (inStock / items.length) * 100 : 0}
          loading={loading}
        />
        <StatCard
          label='Low Stock'
          value={lowStock}
          icon={<LowStockIcon />}
          iconBg='bg-amber-50'
          iconColor='text-amber-600'
          barColor='bg-[#FFC453]'
          pct={items.length ? (lowStock / items.length) * 100 : 0}
          loading={loading}
        />
        <StatCard
          label='Out of Stock'
          value={outOfStock}
          icon={<OutStockIcon />}
          iconBg='bg-[#D82C0D]/8'
          iconColor='text-[#D82C0D]'
          barColor='bg-[#D82C0D]'
          pct={items.length ? (outOfStock / items.length) * 100 : 0}
          loading={loading}
        />
        <StatCard
          label='Inventory Value'
          value={formatCurrency(totalValue)}
          icon={<ValueIcon />}
          iconBg='bg-[#2C6ECB]/8'
          iconColor='text-[#2C6ECB]'
          barColor='bg-[#2C6ECB]'
          pct={100}
          loading={loading}
        />
      </div>

      {/* Low stock alert */}
      {lowStock + outOfStock > 0 && !loading && (
        <div className='flex items-center gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-2xl'>
          <span className='shrink-0'>
            <AlertIcon />
          </span>
          <p className='text-[13px] text-[#202223] flex-1'>
            <strong>{outOfStock} products are out of stock</strong> and{' '}
            <strong>{lowStock} are running low.</strong> Review and restock to
            avoid missed sales.
          </p>
          <button
            onClick={() => setStockFilter('Low Stock')}
            className='ml-auto px-3 py-1.5 bg-white border border-amber-200 text-[12.5px] font-medium text-[#202223] rounded-lg hover:bg-amber-50 transition-colors duration-150 shrink-0 cursor-pointer shadow-sm'
          >
            View Low Stock
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className='flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-600'>
          <ErrorIcon /> Failed to load inventory: {error}
        </div>
      )}

      {/* Table */}
      <div className='bg-white border border-[#E1E3E5] rounded-2xl overflow-hidden shadow-sm'>
        {/* Filters */}
        <div className='flex items-center gap-3 px-4 py-3 border-b border-[#E1E3E5] flex-wrap'>
          <div className='flex items-center gap-2 flex-1 min-w-[180px] px-3 py-2 border border-[#E1E3E5] rounded-lg bg-[#F8F9FA] focus-within:border-[#008060] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#008060]/10 transition-all duration-150'>
            <SearchIcon />
            <input
              type='text'
              placeholder='Search by name, SKU...'
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className='flex-1 bg-transparent text-[13px] text-[#202223] placeholder-[#B0B5BA] outline-none'
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className='text-[#B0B5BA] hover:text-[#6D7175] bg-transparent border-none cursor-pointer transition-colors p-0.5'
              >
                <CloseIcon />
              </button>
            )}
          </div>
          <select
            value={stockFilter}
            onChange={(e) => {
              setStockFilter(e.target.value)
              setPage(1)
            }}
            className='px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none cursor-pointer hover:border-[#8C9196] transition-colors shadow-sm'
          >
            {STOCK_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Stock tabs */}
        <div className='flex items-center border-b border-[#E1E3E5] overflow-x-auto scrollbar-none px-4 gap-0.5'>
          {STOCK_FILTERS.map((f) => {
            const count =
              f === 'All'
                ? items.length
                : f === 'In Stock'
                  ? inStock
                  : f === 'Low Stock'
                    ? lowStock
                    : outOfStock
            return (
              <button
                key={f}
                onClick={() => {
                  setStockFilter(f)
                  setPage(1)
                }}
                className={`px-4 py-2.5 text-[12.5px] font-medium whitespace-nowrap border-b-2 transition-all duration-150 bg-transparent border-l-0 border-r-0 border-t-0 cursor-pointer ${
                  stockFilter === f
                    ? 'border-b-[#008060] text-[#008060]'
                    : 'border-b-transparent text-[#8C9196] hover:text-[#202223]'
                }`}
              >
                {f}
                <span className='ml-1.5 text-[10.5px] text-[#B0B5BA]'>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Table */}
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-[#E1E3E5] bg-[#FAFAFA]'>
                <th className='px-4 py-3 w-8'>
                  <input
                    type='checkbox'
                    className='accent-[#008060] cursor-pointer'
                    checked={
                      paginated.length > 0 &&
                      paginated.every((i) => selectedIds.has(i.id))
                    }
                    onChange={toggleSelectAllVisible}
                  />
                </th>
                {[
                  'Product',
                  'SKU',
                  'Stock',
                  'Reserved',
                  'Incoming',
                  'Value',
                  'Updated',
                  '',
                ].map((h, i) => (
                  <th
                    key={i}
                    className={`px-4 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider ${i === 7 ? 'text-right' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-[#F5F5F5]'>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className='animate-pulse'>
                    <td className='px-4 py-3.5'>
                      <div className='w-4 h-4 bg-[#F1F1F1] rounded' />
                    </td>
                    <td className='px-4 py-3.5'>
                      <div className='flex items-center gap-3'>
                        <div className='w-9 h-9 bg-[#F1F1F1] rounded-xl shrink-0' />
                        <div className='space-y-2'>
                          <div className='w-32 h-2.5 bg-[#F1F1F1] rounded-full' />
                          <div className='w-20 h-2.5 bg-[#F1F1F1] rounded-full' />
                        </div>
                      </div>
                    </td>
                    {[16, 20, 8, 8, 20, 16, 16].map((w, j) => (
                      <td key={j} className='px-4 py-3.5'>
                        <div
                          className={`w-${w} h-2.5 bg-[#F1F1F1] rounded-full`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className='px-4 py-16 text-center'>
                    <div className='flex flex-col items-center gap-3'>
                      <EmptyIcon />
                      <div>
                        <p className='text-[14px] font-medium text-[#202223]'>
                          No items found
                        </p>
                        <p className='text-[13px] text-[#8C9196] mt-0.5'>
                          Try adjusting your search or filters
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((item) => {
                  const status = getStockStatus(
                    item.stock,
                    item.lowStockThreshold,
                  )
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#FAFAFA] transition-colors duration-100 group ${selectedIds.has(item.id) ? 'bg-[#F2F7F5]' : ''}`}
                    >
                      <td className='px-4 py-3.5'>
                        <input
                          type='checkbox'
                          className='accent-[#008060] cursor-pointer'
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                        />
                      </td>
                      {/* Product */}
                      <td className='px-4 py-3.5'>
                        <div className='flex items-center gap-3'>
                          <div className='w-9 h-9 bg-[#F6F6F7] border border-[#E1E3E5] rounded-xl flex items-center justify-center text-lg shrink-0 group-hover:border-[#D1D5DB] transition-colors'>
                            {item.icon}
                          </div>
                          <div className='min-w-0'>
                            <p className='text-[13px] font-medium text-[#202223] truncate max-w-[180px]'>
                              {item.name}
                            </p>
                            <p className='text-[11.5px] text-[#B0B5BA] mt-0.5'>
                              {item.brand} · {item.sport}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className='px-4 py-3.5'>
                        <code className='text-[11px] text-[#6D7175] bg-[#F6F6F7] px-2 py-1 rounded-md font-mono tracking-tight'>
                          {item.sku}
                        </code>
                      </td>

                      {/* Stock */}
                      <td className='px-4 py-3.5'>
                        <div className='space-y-1.5'>
                          <div className='flex items-center gap-2'>
                            <span
                              className={`text-[13px] font-semibold ${status === 'out' ? 'text-[#D82C0D]' : status === 'low' ? 'text-amber-600' : 'text-[#202223]'}`}
                            >
                              {item.stock}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                status === 'out'
                                  ? 'bg-[#D82C0D]/8 text-[#D82C0D]'
                                  : status === 'low'
                                    ? 'bg-amber-50 text-amber-600'
                                    : 'bg-[#008060]/8 text-[#008060]'
                              }`}
                            >
                              {status === 'out'
                                ? 'Out'
                                : status === 'low'
                                  ? 'Low'
                                  : 'OK'}
                            </span>
                          </div>
                          <StockBar
                            stock={item.stock}
                            threshold={item.lowStockThreshold}
                          />
                        </div>
                      </td>

                      {/* Reserved */}
                      <td className='px-4 py-3.5'>
                        <span className='text-[13px] text-[#202223]'>
                          {item.reserved}
                        </span>
                        <p className='text-[11px] text-[#B0B5BA] mt-0.5'>
                          in orders
                        </p>
                      </td>

                      {/* Incoming */}
                      <td className='px-4 py-3.5'>
                        {item.incoming > 0 ? (
                          <span className='text-[13px] font-semibold text-[#2C6ECB]'>
                            +{item.incoming}
                          </span>
                        ) : (
                          <span className='text-[13px] text-[#C4C8CC]'>—</span>
                        )}
                      </td>

                      {/* Value */}
                      <td className='px-4 py-3.5'>
                        <span className='text-[13px] font-semibold text-[#202223]'>
                          {formatCurrency(item.stock * item.costPrice)}
                        </span>
                      </td>

                      {/* Updated */}
                      <td className='px-4 py-3.5'>
                        <span className='text-[12.5px] text-[#8C9196]'>
                          {item.lastUpdated}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className='px-4 py-3.5'>
                        <div className='flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150'>
                          <button
                            onClick={() => {
                              setAdjustId(item.id)
                              setAdjustQty('')
                              setAdjustType('add')
                              setAdjustReason('restock')
                            }}
                            className='inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] hover:border-[#008060] hover:text-[#008060] text-[12px] font-medium text-[#6D7175] rounded-lg transition-all duration-150 cursor-pointer shadow-sm'
                          >
                            <AdjustIcon /> Adjust
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className='flex items-center justify-between px-4 py-3 border-t border-[#F1F1F1]'>
          <p className='text-[12.5px] text-[#8C9196]'>
            Showing{' '}
            <span className='font-medium text-[#202223]'>
              {filtered.length}
            </span>{' '}
            of{' '}
            <span className='font-medium text-[#202223]'>{items.length}</span>{' '}
            items
          </p>
          <div className='flex items-center gap-1'>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className='w-8 h-8 flex items-center justify-center border border-[#E1E3E5] rounded-lg text-[#8C9196] bg-white cursor-pointer hover:bg-[#F6F6F7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
            >
              <ChevronLeftIcon />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-[12.5px] font-medium cursor-pointer transition-all duration-150 ${page === i + 1 ? 'bg-[#008060] text-white border-none shadow-sm shadow-[#008060]/20' : 'border border-[#E1E3E5] text-[#6D7175] bg-white hover:bg-[#F6F6F7]'}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className='w-8 h-8 flex items-center justify-center border border-[#E1E3E5] rounded-lg text-[#8C9196] bg-white cursor-pointer hover:bg-[#F6F6F7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Adjust Modal */}
      {adjustId && adjustItem && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='absolute inset-0 bg-black/40 backdrop-blur-[2px]'
            onClick={() => setAdjustId(null)}
          />
          <div className='relative bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.15)] w-full max-w-md overflow-hidden'>
            {/* Modal header */}
            <div className='flex items-center justify-between px-6 py-4 border-b border-[#E1E3E5]'>
              <h2 className='font-sora text-[16px] font-semibold text-[#202223]'>
                Adjust Stock
              </h2>
              <button
                onClick={() => setAdjustId(null)}
                className='w-7 h-7 flex items-center justify-center text-[#8C9196] hover:text-[#202223] hover:bg-[#F6F6F7] rounded-lg bg-transparent border-none cursor-pointer transition-colors'
              >
                <CloseIcon />
              </button>
            </div>

            <div className='px-6 py-5 space-y-4'>
              {/* Product info */}
              <div className='flex items-center gap-3 p-3.5 bg-[#F8F9FA] rounded-xl border border-[#E1E3E5]'>
                <div className='w-10 h-10 bg-white border border-[#E1E3E5] rounded-xl flex items-center justify-center text-xl shrink-0'>
                  {adjustItem.icon}
                </div>
                <div>
                  <p className='text-[13px] font-medium text-[#202223]'>
                    {adjustItem.name}
                  </p>
                  <p className='text-[11.5px] text-[#8C9196] mt-0.5'>
                    SKU: {adjustItem.sku} · Current:{' '}
                    <strong className='text-[#202223]'>
                      {adjustItem.stock}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Adjust type */}
              <div className='grid grid-cols-3 gap-2'>
                {[
                  { value: 'add', label: 'Add', symbol: '+' },
                  { value: 'remove', label: 'Remove', symbol: '−' },
                  { value: 'set', label: 'Set to', symbol: '=' },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setAdjustType(t.value as any)}
                    className={`flex flex-col items-center gap-1.5 p-3 border-2 rounded-xl text-[12px] font-medium cursor-pointer transition-all duration-150 ${
                      adjustType === t.value
                        ? 'border-[#008060] bg-[#F2F7F5] text-[#008060]'
                        : 'border-[#E1E3E5] bg-white text-[#8C9196] hover:bg-[#FAFAFA] hover:border-[#C4C8CC]'
                    }`}
                  >
                    <span className='text-[20px] font-bold leading-none'>
                      {t.symbol}
                    </span>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Quantity */}
              <input
                type='number'
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder='Enter quantity'
                min='0'
                className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-xl text-[13px] text-[#202223] placeholder-[#C4C8CC] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/10 transition-all duration-150'
              />

              {adjustQty && (
                <p className='text-[12px] text-[#8C9196] px-1'>
                  New stock:{' '}
                  <strong className='text-[#202223] text-[13px]'>
                    {adjustType === 'add'
                      ? Math.max(0, adjustItem.stock + parseInt(adjustQty))
                      : adjustType === 'remove'
                        ? Math.max(0, adjustItem.stock - parseInt(adjustQty))
                        : parseInt(adjustQty)}
                  </strong>
                </p>
              )}

              {/* Reason */}
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-xl text-[13px] text-[#202223] bg-white outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/10 transition-all duration-150 cursor-pointer'
              >
                <option value='restock'>Restock / New shipment</option>
                <option value='return'>Customer return</option>
                <option value='damaged'>Damaged / Defective</option>
                <option value='correction'>Inventory correction</option>
                <option value='transfer'>Store transfer</option>
                <option value='other'>Other</option>
              </select>
            </div>

            {/* Modal footer */}
            <div className='flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[#E1E3E5] bg-[#FAFAFA]'>
              <button
                onClick={() => setAdjustId(null)}
                className='px-4 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg transition-colors duration-150 cursor-pointer'
              >
                Cancel
              </button>
              <button
                onClick={handleAdjust}
                disabled={saving || !adjustQty}
                className='inline-flex items-center gap-2 px-5 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg transition-all duration-150 disabled:opacity-50 cursor-pointer border-none shadow-sm shadow-[#008060]/20'
              >
                {saving ? <SpinnerIcon /> : null}
                {saving ? 'Saving...' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Adjust Modal */}
      {bulkModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='absolute inset-0 bg-black/40 backdrop-blur-[2px]'
            onClick={() => !bulkSaving && setBulkModalOpen(false)}
          />
          <div className='relative bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.15)] w-full max-w-md overflow-hidden'>
            <div className='flex items-center justify-between px-6 py-4 border-b border-[#E1E3E5]'>
              <h2 className='font-sora text-[16px] font-semibold text-[#202223]'>
                Bulk Adjust Stock
              </h2>
              <button
                onClick={() => !bulkSaving && setBulkModalOpen(false)}
                className='w-7 h-7 flex items-center justify-center text-[#8C9196] hover:text-[#202223] hover:bg-[#F6F6F7] rounded-lg bg-transparent border-none cursor-pointer transition-colors'
              >
                <CloseIcon />
              </button>
            </div>

            <div className='px-6 py-5 space-y-4'>
              <div className='p-3.5 bg-[#F8F9FA] rounded-xl border border-[#E1E3E5]'>
                <p className='text-[13px] text-[#202223]'>
                  <strong>{selectedIds.size}</strong> item
                  {selectedIds.size !== 1 ? 's' : ''} selected
                </p>
              </div>

              <div className='grid grid-cols-3 gap-2'>
                <button
                  onClick={() => setBulkType('add')}
                  className={`py-2.5 rounded-lg text-[13px] font-medium border cursor-pointer transition-colors ${
                    bulkType === 'add'
                      ? 'border-[#008060] bg-[#008060]/8 text-[#008060]'
                      : 'border-[#E1E3E5] text-[#6D7175] hover:bg-[#F6F6F7]'
                  }`}
                >
                  + Add
                </button>
                <button
                  onClick={() => setBulkType('remove')}
                  className={`py-2.5 rounded-lg text-[13px] font-medium border cursor-pointer transition-colors ${
                    bulkType === 'remove'
                      ? 'border-[#D82C0D] bg-[#D82C0D]/8 text-[#D82C0D]'
                      : 'border-[#E1E3E5] text-[#6D7175] hover:bg-[#F6F6F7]'
                  }`}
                >
                  − Remove
                </button>
                <button
                  onClick={() => setBulkType('set')}
                  className={`py-2.5 rounded-lg text-[13px] font-medium border cursor-pointer transition-colors ${
                    bulkType === 'set'
                      ? 'border-[#2C6ECB] bg-[#2C6ECB]/8 text-[#2C6ECB]'
                      : 'border-[#E1E3E5] text-[#6D7175] hover:bg-[#F6F6F7]'
                  }`}
                >
                  = Set to
                </button>
              </div>

              <div>
                <label className='block text-[12px] font-medium text-[#6D7175] mb-1.5'>
                  {bulkType === 'set'
                    ? 'Set stock to (applied to every selected item)'
                    : 'Quantity'}
                </label>
                <input
                  type='number'
                  min={0}
                  value={bulkQty}
                  onChange={(e) => setBulkQty(e.target.value)}
                  disabled={bulkSaving}
                  placeholder='0'
                  className='w-full px-3.5 py-2.5 border border-[#E1E3E5] rounded-lg text-[14px] text-[#202223] outline-none focus:border-[#008060] focus:ring-2 focus:ring-[#008060]/15 transition-all'
                />
                <p className='text-[11.5px] text-[#8C9196] mt-1.5'>
                  {bulkType === 'add' &&
                    'Adds this amount to each selected item\u2019s current stock.'}
                  {bulkType === 'remove' &&
                    'Removes this amount from each selected item\u2019s current stock (never goes below 0).'}
                  {bulkType === 'set' &&
                    'Every selected item\u2019s stock becomes exactly this number.'}
                </p>
              </div>

              {bulkSaving && (
                <div className='space-y-1.5'>
                  <div className='h-1.5 bg-[#F1F1F1] rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-[#008060] transition-all duration-200'
                      style={{
                        width: `${(bulkProgress.done / Math.max(1, bulkProgress.total)) * 100}%`,
                      }}
                    />
                  </div>
                  <p className='text-[11.5px] text-[#8C9196]'>
                    Updating {bulkProgress.done} of {bulkProgress.total}…
                  </p>
                </div>
              )}
            </div>

            <div className='flex items-center justify-end gap-2.5 px-6 py-4 bg-[#FAFAFA] border-t border-[#E1E3E5]'>
              <button
                onClick={() => setBulkModalOpen(false)}
                disabled={bulkSaving}
                className='px-4 py-2 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-50'
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAdjust}
                disabled={bulkSaving || !bulkQty}
                className='inline-flex items-center gap-2 px-5 py-2 bg-[#008060] hover:bg-[#006e52] text-white text-[13px] font-semibold rounded-lg transition-all duration-150 disabled:opacity-50 cursor-pointer border-none shadow-sm shadow-[#008060]/20'
              >
                {bulkSaving ? <SpinnerIcon /> : null}
                {bulkSaving ? 'Applying...' : `Apply to ${selectedIds.size} items`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
