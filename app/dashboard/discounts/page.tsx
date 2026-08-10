'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useDiscounts } from '@/hooks/useDashboard'
import { deleteDiscount } from '@/lib/api/dashboard'

type DiscountType = 'percentage' | 'fixed' | 'free_shipping' | 'buy_x_get_y'

type Discount = {
  id: string
  code: string
  description: string
  type: DiscountType
  value: number
  minQuantity: number | string | null
  minOrderAmount: number
  maxUses: number | null
  startsAt: string | null
  expiresAt: string | null
  isActive: boolean
  usedCount: number
}

const TYPE_CONFIG: Record<
  DiscountType,
  { label: string; color: string; bg: string }
> = {
  percentage: {
    label: 'Percentage',
    color: 'text-[#008060]',
    bg: 'bg-[#008060]/10',
  },
  fixed: {
    label: 'Fixed Amount',
    color: 'text-[#2C6ECB]',
    bg: 'bg-[#2C6ECB]/10',
  },
  free_shipping: {
    label: 'Free Shipping',
    color: 'text-purple-700',
    bg: 'bg-purple-100',
  },
  buy_x_get_y: {
    label: 'Quantity Discount',
    color: 'text-[#916A00]',
    bg: 'bg-[#FFC453]/20',
  },
}

function formatValue(type: string, value: number, minQuantity?: number | string | null) {
  if (type === 'percentage') return `${value}% off`
  if (type === 'fixed') return `£${value} off`
  if (type === 'free_shipping') return 'Free shipping'
  return minQuantity ? `Buy ${minQuantity}+, get ${value}% off` : `${value}% off`
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

function usagePct(used: number, max: number | null) {
  if (!max) return null
  return Math.round((used / max) * 100)
}

// ── SVG Icons ─────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
    >
      <path d='M12 4v16M4 12h16' />
    </svg>
  )
}

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

function CopyIcon() {
  return (
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
  )
}

function CheckIcon() {
  return (
    <svg
      width='13'
      height='13'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
    >
      <path d='M4 13l5 5L20 6' />
    </svg>
  )
}

function EditIcon({
  size = 13,
  color = 'currentColor',
}: {
  size?: number
  color?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke={color}
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z' />
    </svg>
  )
}

function TrashIcon({
  size = 13,
  color = 'currentColor',
}: {
  size?: number
  color?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke={color}
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M3 6h18' />
      <path d='M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2' />
      <path d='M19 6l-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
      <path d='M10 11v5M14 11v5' />
    </svg>
  )
}

function AlertIcon() {
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

function TotalDiscountsIcon() {
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
      <path d='M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z' />
      <circle cx='7' cy='7' r='1.5' fill='currentColor' stroke='none' />
    </svg>
  )
}

function ActiveDiscountIcon() {
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

function UsedIcon() {
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
      <path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' />
      <circle cx='9' cy='7' r='4' />
      <path d='M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' />
    </svg>
  )
}

function ExpiredIcon() {
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
      <path d='M12 8v4M12 16h.01' />
    </svg>
  )
}

function EmptyDiscountsIcon() {
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
      <path d='M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z' />
      <circle cx='7' cy='7' r='1.5' fill='#C4C8CC' stroke='none' />
    </svg>
  )
}

// ── Toggle ────────────────────────────────────────────────────────

function Toggle({ checked }: { checked: boolean }) {
  return (
    <div
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-[#008060]' : 'bg-[#D1D5DB]'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
      />
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  loading,
}: {
  label: string
  value: number
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  loading?: boolean
}) {
  return (
    <div className='bg-white border border-[#E1E3E5] rounded-2xl p-5 flex items-center gap-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200'>
      <div
        className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center ${iconColor} shrink-0`}
      >
        {icon}
      </div>
      <div>
        <p className='font-sora text-[22px] font-bold text-[#202223] leading-tight tracking-tight'>
          {loading ? (
            <span className='inline-block w-10 h-6 bg-[#F1F1F1] rounded animate-pulse' />
          ) : (
            value
          )}
        </p>
        <p className='text-[11.5px] text-[#8C9196] mt-0.5'>{label}</p>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────

export default function DiscountsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, loading, error, refetch } = useDiscounts({ limit: 100 })
  const discounts: Discount[] = data?.discounts ?? []

  const filtered = discounts.filter((d) => {
    const matchSearch =
      d.code.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'All' || d.type === typeFilter
    const expired = isExpired(d.expiresAt)
    const matchStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active' && d.isActive && !expired) ||
      (statusFilter === 'Inactive' && !d.isActive) ||
      (statusFilter === 'Expired' && expired)
    return matchSearch && matchType && matchStatus
  })

  const activeCount = discounts.filter(
    (d) => d.isActive && !isExpired(d.expiresAt),
  ).length
  const totalUsed = discounts.reduce((s, d) => s + d.usedCount, 0)
  const expiredCount = discounts.filter((d) => isExpired(d.expiresAt)).length

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = async (id: string) => {
    await deleteDiscount(id)
    setDeleteId(null)
    refetch()
  }

  const TYPE_FILTERS = [
    'All',
    'percentage',
    'fixed',
    'free_shipping',
    'buy_x_get_y',
  ]
  const STATUS_FILTERS = ['All', 'Active', 'Inactive', 'Expired']

  const typeLabel = (t: string) => {
    if (t === 'All') return 'All Types'
    return TYPE_CONFIG[t as DiscountType]?.label ?? t
  }

  return (
    <div className='space-y-5'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-sora text-[22px] font-semibold text-[#202223] tracking-tight'>
            Discounts
          </h1>
          <p className='text-[13px] text-[#8C9196] mt-0.5'>
            {discounts.length} discount codes total
          </p>
        </div>
        <Link
          href='/dashboard/discounts/add'
          className='inline-flex items-center gap-2 px-4 py-2 bg-[#008060] hover:bg-[#006e52] active:bg-[#005c45] text-white text-[13px] font-medium rounded-lg transition-all duration-150 border-none cursor-pointer shadow-sm shadow-[#008060]/20 no-underline'
        >
          <PlusIcon />
          Create Discount
        </Link>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 xl:grid-cols-4 gap-4'>
        <StatCard
          label='Total Discounts'
          value={discounts.length}
          icon={<TotalDiscountsIcon />}
          iconBg='bg-[#2C6ECB]/8'
          iconColor='text-[#2C6ECB]'
          loading={loading}
        />
        <StatCard
          label='Active'
          value={activeCount}
          icon={<ActiveDiscountIcon />}
          iconBg='bg-[#008060]/8'
          iconColor='text-[#008060]'
          loading={loading}
        />
        <StatCard
          label='Total Used'
          value={totalUsed}
          icon={<UsedIcon />}
          iconBg='bg-amber-50'
          iconColor='text-amber-600'
          loading={loading}
        />
        <StatCard
          label='Expired'
          value={expiredCount}
          icon={<ExpiredIcon />}
          iconBg='bg-[#D82C0D]/8'
          iconColor='text-[#D82C0D]'
          loading={loading}
        />
      </div>

      {/* Error */}
      {error && (
        <div className='flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-600'>
          <AlertIcon />
          Failed to load discounts: {error}
        </div>
      )}

      {/* Table card */}
      <div className='bg-white border border-[#E1E3E5] rounded-2xl overflow-hidden shadow-sm'>
        {/* Filters */}
        <div className='flex items-center gap-3 px-4 py-3 border-b border-[#E1E3E5] flex-wrap'>
          <div className='flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 border border-[#E1E3E5] rounded-lg bg-[#F8F9FA] focus-within:border-[#008060] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#008060]/10 transition-all duration-150'>
            <SearchIcon />
            <input
              type='text'
              placeholder='Search discounts...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className='px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none cursor-pointer hover:border-[#8C9196] transition-colors shadow-sm'
          >
            {TYPE_FILTERS.map((t) => (
              <option key={t} value={t}>
                {typeLabel(t)}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className='px-3 py-2 border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] bg-white outline-none cursor-pointer hover:border-[#8C9196] transition-colors shadow-sm'
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Status tabs */}
        <div className='flex items-center border-b border-[#E1E3E5] overflow-x-auto scrollbar-none px-4 gap-0.5'>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2.5 text-[12.5px] font-medium whitespace-nowrap border-b-2 transition-all duration-150 bg-transparent border-l-0 border-r-0 border-t-0 cursor-pointer ${
                statusFilter === s
                  ? 'border-b-[#008060] text-[#008060]'
                  : 'border-b-transparent text-[#8C9196] hover:text-[#202223]'
              }`}
            >
              {s}
              <span className='ml-1.5 text-[10.5px] text-[#B0B5BA]'>
                {s === 'All'
                  ? discounts.length
                  : s === 'Active'
                    ? activeCount
                    : s === 'Inactive'
                      ? discounts.filter((d) => !d.isActive).length
                      : expiredCount}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-[#E1E3E5] bg-[#FAFAFA]'>
                {[
                  'Code',
                  'Type',
                  'Value',
                  'Usage',
                  'Min Order',
                  'Expires',
                  'Status',
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
                [...Array(6)].map((_, i) => (
                  <tr key={i} className='animate-pulse'>
                    <td className='px-4 py-3.5'>
                      <div className='w-24 h-7 bg-[#F1F1F1] rounded-lg' />
                    </td>
                    <td className='px-4 py-3.5'>
                      <div className='w-20 h-5 bg-[#F1F1F1] rounded-full' />
                    </td>
                    <td className='px-4 py-3.5'>
                      <div className='w-16 h-2.5 bg-[#F1F1F1] rounded-full' />
                    </td>
                    <td className='px-4 py-3.5'>
                      <div className='w-20 h-2.5 bg-[#F1F1F1] rounded-full' />
                    </td>
                    <td className='px-4 py-3.5'>
                      <div className='w-12 h-2.5 bg-[#F1F1F1] rounded-full' />
                    </td>
                    <td className='px-4 py-3.5'>
                      <div className='w-20 h-2.5 bg-[#F1F1F1] rounded-full' />
                    </td>
                    <td className='px-4 py-3.5'>
                      <div className='w-9 h-5 bg-[#F1F1F1] rounded-full' />
                    </td>
                    <td className='px-4 py-3.5'>
                      <div className='w-7 h-7 bg-[#F1F1F1] rounded-lg ml-auto' />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className='px-4 py-16 text-center'>
                    <div className='flex flex-col items-center gap-3'>
                      <EmptyDiscountsIcon />
                      <div>
                        <p className='text-[14px] font-medium text-[#202223]'>
                          No discounts found
                        </p>
                        <p className='text-[13px] text-[#8C9196] mt-0.5'>
                          Try adjusting your search or filters
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((discount) => {
                  const config =
                    TYPE_CONFIG[discount.type] ?? TYPE_CONFIG.percentage
                  const pct = usagePct(discount.usedCount, discount.maxUses)
                  const expired = isExpired(discount.expiresAt)
                  return (
                    <tr
                      key={discount.id}
                      className='hover:bg-[#FAFAFA] transition-colors duration-100 group'
                    >
                      {/* Code */}
                      <td className='px-4 py-3.5'>
                        <div className='flex items-center gap-2'>
                          <code className='text-[12.5px] font-bold text-[#202223] bg-[#F6F6F7] border border-[#E1E3E5] px-2.5 py-1 rounded-lg tracking-widest font-mono'>
                            {discount.code}
                          </code>
                          <button
                            onClick={() => copyCode(discount.id, discount.code)}
                            className={`w-6 h-6 flex items-center justify-center rounded transition-all duration-150 bg-transparent border-none cursor-pointer ${
                              copiedId === discount.id
                                ? 'text-[#008060] bg-[#F2F7F5]'
                                : 'text-[#B0B5BA] hover:text-[#008060] hover:bg-[#F2F7F5]'
                            }`}
                            title='Copy code'
                          >
                            {copiedId === discount.id ? (
                              <CheckIcon />
                            ) : (
                              <CopyIcon />
                            )}
                          </button>
                        </div>
                        <p className='text-[11px] text-[#B0B5BA] mt-1 max-w-[200px] truncate'>
                          {discount.description}
                        </p>
                      </td>

                      {/* Type */}
                      <td className='px-4 py-3.5'>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${config.bg} ${config.color}`}
                        >
                          {config.label}
                        </span>
                      </td>

                      {/* Value */}
                      <td className='px-4 py-3.5'>
                        <span className='text-[13px] font-semibold text-[#202223]'>
                          {formatValue(discount.type, discount.value, discount.minQuantity)}
                        </span>
                      </td>

                      {/* Usage */}
                      <td className='px-4 py-3.5'>
                        <div className='space-y-1.5'>
                          <div className='flex items-center gap-1.5'>
                            <span className='text-[13px] font-medium text-[#202223]'>
                              {discount.usedCount}
                            </span>
                            {discount.maxUses && (
                              <span className='text-[11.5px] text-[#B0B5BA]'>
                                / {discount.maxUses}
                              </span>
                            )}
                          </div>
                          {pct !== null && (
                            <div className='w-24 h-1.5 bg-[#E1E3E5] rounded-full overflow-hidden'>
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${pct >= 90 ? 'bg-[#D82C0D]' : pct >= 70 ? 'bg-[#FFC453]' : 'bg-[#008060]'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Min Order */}
                      <td className='px-4 py-3.5'>
                        <span className='text-[12.5px] text-[#202223]'>
                          {discount.minOrderAmount > 0
                            ? `£${discount.minOrderAmount}`
                            : '—'}
                        </span>
                      </td>

                      {/* Expires */}
                      <td className='px-4 py-3.5'>
                        {discount.expiresAt ? (
                          <div>
                            <span
                              className={`text-[12.5px] ${expired ? 'text-[#D82C0D]' : 'text-[#202223]'}`}
                            >
                              {new Date(discount.expiresAt).toLocaleDateString(
                                'en-GB',
                                {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                },
                              )}
                            </span>
                            {expired && (
                              <p className='text-[10.5px] text-[#D82C0D] font-medium mt-0.5'>
                                Expired
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className='text-[12.5px] text-[#B0B5BA]'>
                            No expiry
                          </span>
                        )}
                      </td>

                      {/* Status toggle */}
                      <td className='px-4 py-3.5'>
                        <Toggle checked={discount.isActive && !expired} />
                      </td>

                      {/* Actions */}
                      <td className='px-4 py-3.5'>
                        <div className='flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150'>
                          <Link
                            href={`/dashboard/discounts/add?id=${discount.id}`}
                            className='w-7 h-7 flex items-center justify-center text-[#8C9196] hover:text-[#008060] hover:bg-[#008060]/5 rounded-lg transition-all duration-150 no-underline'
                            title='Edit'
                          >
                            <EditIcon />
                          </Link>
                          <button
                            onClick={() => setDeleteId(discount.id)}
                            className='w-7 h-7 flex items-center justify-center text-[#8C9196] hover:text-[#D82C0D] hover:bg-[#D82C0D]/5 rounded-lg transition-all duration-150 bg-transparent border-none cursor-pointer'
                            title='Delete'
                          >
                            <TrashIcon />
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

        {/* Footer */}
        <div className='px-4 py-3 border-t border-[#F1F1F1]'>
          <p className='text-[12.5px] text-[#8C9196]'>
            Showing{' '}
            <span className='font-medium text-[#202223]'>
              {filtered.length}
            </span>{' '}
            of{' '}
            <span className='font-medium text-[#202223]'>
              {discounts.length}
            </span>{' '}
            discounts
          </p>
        </div>
      </div>

      {/* Delete Modal */}
      {deleteId && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='absolute inset-0 bg-black/40 backdrop-blur-[2px]'
            onClick={() => setDeleteId(null)}
          />
          <div className='relative bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.15)] w-full max-w-sm p-6'>
            <div className='w-12 h-12 bg-[#D82C0D]/8 rounded-2xl flex items-center justify-center mx-auto mb-4'>
              <TrashIcon size={22} color='#D82C0D' />
            </div>
            <h3 className='font-sora text-[16px] font-semibold text-[#202223] text-center mb-2'>
              Delete Discount
            </h3>
            <p className='text-[13px] text-[#6D7175] text-center leading-relaxed mb-6'>
              Are you sure you want to delete{' '}
              <span className='font-bold text-[#202223] font-mono tracking-wider'>
                {discounts.find((d) => d.id === deleteId)?.code}
              </span>
              ? This cannot be undone.
            </p>
            <div className='flex gap-2.5'>
              <button
                onClick={() => setDeleteId(null)}
                className='flex-1 py-2.5 border border-[#E1E3E5] bg-white hover:bg-[#F6F6F7] text-[13px] font-medium text-[#202223] rounded-lg transition-colors duration-150 cursor-pointer'
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className='flex-1 py-2.5 bg-[#D82C0D] hover:bg-[#be2209] active:bg-[#a01d07] text-white text-[13px] font-semibold rounded-lg transition-all duration-150 border-none cursor-pointer shadow-sm shadow-[#D82C0D]/20'
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
