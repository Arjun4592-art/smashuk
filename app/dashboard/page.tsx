'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { toast } from 'sonner'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { useDashboardStats, useOrders, useProducts } from '@/hooks/useDashboard'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

const STATUS_STYLES: Record<string, string> = {
  delivered: 'bg-[#008060]/10 text-[#008060]',
  processing: 'bg-[#2C6ECB]/10 text-[#2C6ECB]',
  shipped: 'bg-purple-100 text-purple-700',
  pending: 'bg-[#FFC453]/20 text-[#916A00]',
  cancelled: 'bg-[#D82C0D]/10 text-[#D82C0D]',
  refunded: 'bg-[#6D7175]/10 text-[#6D7175]',
}

// ── Premium SVG Icons ─────────────────────────────────────────────────────────

function RevenueIcon() {
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

function OrdersIcon() {
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
      <path d='M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' />
      <polyline points='3.27 6.96 12 12.01 20.73 6.96' />
      <line x1='12' y1='22.08' x2='12' y2='12' />
    </svg>
  )
}

function CustomersIcon() {
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
      <path d='M23 21v-2a4 4 0 0 0-3-3.87' />
      <path d='M16 3.13a4 4 0 0 1 0 7.75' />
    </svg>
  )
}

function ProductsIcon() {
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
      <rect x='3' y='3' width='7' height='7' rx='1' />
      <rect x='14' y='3' width='7' height='7' rx='1' />
      <rect x='3' y='14' width='7' height='7' rx='1' />
      <rect x='14' y='14' width='7' height='7' rx='1' />
    </svg>
  )
}

function TrendUpIcon() {
  return (
    <svg
      width='11'
      height='11'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <polyline points='23 6 13.5 15.5 8.5 10.5 1 18' />
      <polyline points='17 6 23 6 23 12' />
    </svg>
  )
}

function TrendDownIcon() {
  return (
    <svg
      width='11'
      height='11'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <polyline points='23 18 13.5 8.5 8.5 13.5 1 6' />
      <polyline points='17 18 23 18 23 12' />
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

function PlusIcon() {
  return (
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
      <path d='M12 4v16M4 12h16' />
    </svg>
  )
}

function NewOrderIcon() {
  return (
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
      <path d='M6 2h12l2 6H4L6 2z' />
      <path d='M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8' />
      <path d='M9 12a3 3 0 0 0 6 0' />
    </svg>
  )
}

function AddCustomerIcon() {
  return (
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
      <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
      <circle cx='12' cy='7' r='4' />
      <line x1='19' y1='8' x2='19' y2='14' />
      <line x1='16' y1='11' x2='22' y2='11' />
    </svg>
  )
}

function DiscountIcon() {
  return (
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
      <path d='M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z' />
      <circle cx='7' cy='7' r='1.5' fill='currentColor' stroke='none' />
    </svg>
  )
}

function ArrowRightIcon() {
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
      <path d='M4 12h16M13 5l7 7-7 7' />
    </svg>
  )
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className='bg-white border border-[#E1E3E5] rounded-xl px-3.5 py-2.5 shadow-lg shadow-black/5'>
      <p className='text-[11px] text-[#8C9196] mb-1.5'>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className='text-[13px] font-semibold text-[#202223]'>
          {p.dataKey === 'revenue'
            ? formatCurrency(p.value)
            : `${p.value} orders`}
        </p>
      ))}
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

const STAT_ICON_COLORS = [
  { bg: 'bg-[#008060]/8', text: 'text-[#008060]' },
  { bg: 'bg-[#2C6ECB]/8', text: 'text-[#2C6ECB]' },
  { bg: 'bg-purple-50', text: 'text-purple-600' },
  { bg: 'bg-amber-50', text: 'text-amber-600' },
]

function StatCard({
  title,
  value,
  change,
  icon,
  subtitle,
  loading,
  colorIndex = 0,
}: {
  title: string
  value: string
  change: number
  icon: React.ReactNode
  subtitle?: string
  loading?: boolean
  colorIndex?: number
}) {
  const positive = change >= 0
  const colors = STAT_ICON_COLORS[colorIndex]

  if (loading) {
    return (
      <div className='bg-white border border-[#E1E3E5] rounded-2xl p-5 animate-pulse'>
        <div className='flex items-start justify-between mb-4'>
          <div className='w-10 h-10 bg-[#F1F1F1] rounded-xl' />
          <div className='w-16 h-5 bg-[#F1F1F1] rounded-full' />
        </div>
        <div className='w-24 h-3 bg-[#F1F1F1] rounded-full mb-2.5' />
        <div className='w-32 h-7 bg-[#F1F1F1] rounded-lg' />
      </div>
    )
  }

  return (
    <div className='group bg-white border border-[#E1E3E5] rounded-2xl p-5 hover:shadow-[0_4px_24px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 transition-all duration-200 ease-out'>
      <div className='flex items-start justify-between mb-4'>
        <div
          className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center ${colors.text} transition-transform duration-200 group-hover:scale-105`}
        >
          {icon}
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[11.5px] font-medium px-2.5 py-1 rounded-full ${
            positive
              ? 'bg-[#008060]/8 text-[#008060]'
              : 'bg-[#D82C0D]/8 text-[#D82C0D]'
          }`}
        >
          {positive ? <TrendUpIcon /> : <TrendDownIcon />}
          {Math.abs(change)}%
        </span>
      </div>
      <p className='text-[12px] font-medium text-[#8C9196] mb-1 tracking-wide uppercase'>
        {title}
      </p>
      <p className='font-sora text-[26px] font-bold text-[#202223] leading-tight tracking-tight'>
        {value}
      </p>
      {subtitle && (
        <p className='text-[11.5px] text-[#B0B5BA] mt-1'>{subtitle}</p>
      )}
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────
// NOTE: this component only applies justify-between correctly once it is
// full-width itself. Render it directly without an extra flex-wrapper
// (keep the parent block-level).

function SectionHeader({
  title,
  subtitle,
  link,
  linkLabel,
}: {
  title: string
  subtitle?: string
  link?: string
  linkLabel?: string
}) {
  return (
    <div className='flex items-center justify-between w-full'>
      <div>
        <h2 className='font-sora text-[15px] font-semibold text-[#202223]'>
          {title}
        </h2>
        {subtitle && (
          <p className='text-[12px] text-[#8C9196] mt-0.5'>{subtitle}</p>
        )}
      </div>
      {link && (
        <Link
          href={link}
          className='inline-flex items-center gap-1.5 text-[12.5px] text-[#008060] hover:text-[#006e52] no-underline font-medium transition-colors group shrink-0'
        >
          {linkLabel}
          <span className='transition-transform duration-150 group-hover:translate-x-0.5'>
            <ArrowRightIcon />
          </span>
        </Link>
      )}
    </div>
  )
}

type Order = {
  id: string
  customer: string
  orderNumber: string
  items: number
  amount: number
  date: string
  status: string
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState('last30')
  const router = useRouter()

  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useDashboardStats(dateRange)
  const { data: ordersData, loading: ordersLoading } = useOrders({ limit: 5 })
  const { data: productsData } = useProducts({ limit: 4 })

  const recentOrders: Order[] = ordersData?.orders ?? []
  const topProducts = productsData?.products ?? []

  const salesData = stats?.salesData ?? []
  const categoryBreakdown = stats?.sportBreakdown ?? []

  // BUG FIX: every stat card subtitle used to hardcode "vs last 30 days"
  // regardless of the dropdown above — misleading once you picked "Today"
  // or "Last 90 days" while the comparison text kept claiming 30 days.
  const RANGE_LABELS: Record<string, string> = {
    today: 'vs yesterday',
    last7: 'vs previous 7 days',
    last30: 'vs last 30 days',
    last90: 'vs previous 90 days',
    thisyear: 'vs last year',
  }
  const comparisonLabel = RANGE_LABELS[dateRange] ?? 'vs previous period'

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-sora text-[22px] font-semibold text-[#202223] tracking-tight'>
            Overview
          </h1>
          <p className='text-[13px] text-[#8C9196] mt-0.5'>
            Welcome back! Here&apos;s what&apos;s happening with your store.
          </p>
        </div>
        <div className='flex items-center gap-2.5'>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className='px-3 py-2 bg-white border border-[#E1E3E5] rounded-lg text-[13px] text-[#202223] outline-none cursor-pointer hover:border-[#8C9196] transition-colors shadow-sm'
          >
            <option value='today'>Today</option>
            <option value='last7'>Last 7 days</option>
            <option value='last30'>Last 30 days</option>
            <option value='last90'>Last 90 days</option>
            <option value='thisyear'>This year</option>
          </select>
          <button
            onClick={() => {
              const rows = [
                { Metric: 'Total Revenue', Value: stats?.totalRevenue ?? 0 },
                { Metric: 'Total Orders', Value: stats?.totalOrders ?? 0 },
                { Metric: 'Total Customers', Value: stats?.totalCustomers ?? 0 },
                { Metric: 'Total Products', Value: stats?.totalProducts ?? 0 },
                ...categoryBreakdown.map((c: any) => ({
                  Metric: `Category: ${c.name}`,
                  Value: c.value,
                })),
              ]
              const csv = Papa.unparse(rows)
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `overview-export-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
              toast.success('Exported overview data')
            }}
            className='inline-flex items-center gap-2 px-4 py-2 bg-[#008060] hover:bg-[#006e52] active:bg-[#005c45] text-white text-[13px] font-medium rounded-lg transition-all duration-150 shadow-sm shadow-[#008060]/20'
          >
            <ExportIcon />
            Export
          </button>
        </div>
      </div>

      {/* Error banner */}
      {statsError && (
        <div className='px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-600 flex items-center justify-between'>
          <span>Failed to load stats: {statsError}</span>
          <button
            onClick={refetchStats}
            className='ml-3 underline cursor-pointer bg-transparent border-none text-red-600 text-[13px]'
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats grid */}
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
        <StatCard
          title='Total Revenue'
          value={stats ? formatCurrency(stats.totalRevenue) : '—'}
          change={stats?.revenueChange ?? 0}
          icon={<RevenueIcon />}
          subtitle={comparisonLabel}
          loading={statsLoading}
          colorIndex={0}
        />
        <StatCard
          title='Total Orders'
          value={stats ? stats.totalOrders.toLocaleString() : '—'}
          change={stats?.ordersChange ?? 0}
          icon={<OrdersIcon />}
          subtitle={comparisonLabel}
          loading={statsLoading}
          colorIndex={1}
        />
        <StatCard
          title='Total Customers'
          value={stats ? stats.totalCustomers.toLocaleString() : '—'}
          change={stats?.customersChange ?? 0}
          icon={<CustomersIcon />}
          subtitle={comparisonLabel}
          loading={statsLoading}
          colorIndex={2}
        />
        <StatCard
          title='Total Products'
          value={stats ? stats.totalProducts.toLocaleString() : '—'}
          change={stats?.productsChange ?? 0}
          icon={<ProductsIcon />}
          subtitle='active products'
          loading={statsLoading}
          colorIndex={3}
        />
      </div>

      {/* Charts row */}
      <div className='grid grid-cols-1 xl:grid-cols-3 gap-4'>
        {/* Revenue chart */}
        <div className='xl:col-span-2 bg-white border border-[#E1E3E5] rounded-2xl p-5 shadow-sm'>
          <SectionHeader
            title='Revenue Overview'
            subtitle='Daily revenue for the selected period'
          />
          {salesData.length === 0 && !statsLoading ? (
            <div className='h-[220px] flex flex-col items-center justify-center gap-2 text-center'>
              <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#E1E3E5' strokeWidth='1.5'>
                <polyline points='22 12 18 12 15 21 9 3 6 12 2 12' />
              </svg>
              <p className='text-[12.5px] text-[#8C9196]'>No revenue data for this period</p>
            </div>
          ) : (
          <ResponsiveContainer width='100%' height={220}>
            <AreaChart
              data={salesData}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id='revenueGrad' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='#008060' stopOpacity={0.1} />
                  <stop offset='100%' stopColor='#008060' stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray='3 3'
                stroke='#F1F1F1'
                vertical={false}
              />
              <XAxis
                dataKey='date'
                tick={{ fontSize: 11, fill: '#B0B5BA' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#B0B5BA' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `£${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: '#E1E3E5', strokeWidth: 1 }}
              />
              <Area
                type='monotone'
                dataKey='revenue'
                stroke='#008060'
                strokeWidth={2}
                fill='url(#revenueGrad)'
                dot={false}
                activeDot={{ r: 4, fill: '#008060', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          )}
        </div>

        {/* Orders by Categories */}
        <div className='bg-white border border-[#E1E3E5] rounded-2xl p-5 shadow-sm flex flex-col'>
          <SectionHeader title='Orders by Categories' />

          {/* Sirf chart ka section scrollable - fixed visible height,
              the inner chart takes its own full height (no overlap with more categories) */}
          <div className='mt-3 max-h-[160px] overflow-y-auto pr-1 [scrollbar-width:thin]'>
            <ResponsiveContainer
              width='100%'
              height={Math.max(160, categoryBreakdown.length * 28)}
            >
              <BarChart
                data={categoryBreakdown}
                layout='vertical'
                margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
              >
                <XAxis type='number' hide />
                <YAxis
                  type='category'
                  dataKey='sport'
                  tick={{ fontSize: 12, fill: '#6D7175' }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: '#F6F6F7' }}
                />
                <Bar
                  dataKey='orders'
                  fill='#008060'
                  radius={[0, 5, 5, 0]}
                  barSize={12}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* List below is normal, no scroll */}
          <div className='mt-4 space-y-2.5 pt-4 border-t border-[#F1F1F1]'>
            {categoryBreakdown.map((s) => (
              <div
                key={s.sport}
                className='flex items-center justify-between group'
              >
                <div className='flex items-center gap-2'>
                  <span
                    className='w-2 h-2 rounded-full shrink-0 transition-transform duration-150 group-hover:scale-125'
                    style={{ background: s.color }}
                  />
                  <span className='text-[12.5px] text-[#202223]'>
                    {s.sport}
                  </span>
                </div>
                <span className='text-[12.5px] font-semibold text-[#202223]'>
                  {s.orders}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className='grid grid-cols-1 xl:grid-cols-3 gap-4'>
        {/* Recent Orders */}
        <div className='xl:col-span-2 bg-white border border-[#E1E3E5] rounded-2xl overflow-hidden shadow-sm'>
          <div className='px-5 py-4 border-b border-[#F1F1F1]'>
            <SectionHeader
              title='Recent Orders'
              link='/dashboard/orders'
              linkLabel='View all'
            />
          </div>
          <div className='divide-y divide-[#F6F6F7]'>
            {ordersLoading
              ? [...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className='flex items-center gap-4 px-5 py-3.5 animate-pulse'
                  >
                    <div className='w-8 h-8 bg-[#F1F1F1] rounded-full shrink-0' />
                    <div className='flex-1 space-y-2'>
                      <div className='w-32 h-2.5 bg-[#F1F1F1] rounded-full' />
                      <div className='w-24 h-2.5 bg-[#F1F1F1] rounded-full' />
                    </div>
                    <div className='w-20 h-2.5 bg-[#F1F1F1] rounded-full' />
                    <div className='w-16 h-5 bg-[#F1F1F1] rounded-full' />
                  </div>
                ))
              : recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className='flex items-center gap-4 px-5 py-3.5 hover:bg-[#FAFAFA] transition-colors duration-150 cursor-default'
                  >
                    <div className='w-8 h-8 rounded-full bg-[#008060]/8 flex items-center justify-center text-[#008060] text-[12px] font-bold shrink-0 ring-1 ring-[#008060]/10'>
                      {order.customer.charAt(0)}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-[13px] font-medium text-[#202223] truncate'>
                        {order.customer}
                      </p>
                      <p className='text-[11.5px] text-[#B0B5BA] truncate mt-0.5'>
                        {order.orderNumber} · {order.items} item
                        {order.items > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className='text-right shrink-0'>
                      <p className='text-[13px] font-semibold text-[#202223]'>
                        {formatCurrency(order.amount)}
                      </p>
                      <p className='text-[11px] text-[#B0B5BA] mt-0.5'>
                        {order.date}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium capitalize shrink-0 ${STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {order.status}
                    </span>
                  </div>
                ))}
          </div>
        </div>

        {/* Right column */}
        <div className='space-y-4'>
          {/* Quick Actions */}
          <div className='bg-white border border-[#E1E3E5] rounded-2xl p-5 shadow-sm'>
            <h2 className='font-sora text-[15px] font-semibold text-[#202223] mb-3.5'>
              Quick Actions
            </h2>
            <div className='grid grid-cols-2 gap-2'>
              {[
                {
                  label: 'Add Product',
                  href: '/dashboard/products/new',
                  icon: <PlusIcon />,
                  color: 'text-[#008060]',
                  bg: 'hover:bg-[#008060]/5 hover:border-[#008060]/20',
                },
                {
                  label: 'New Order',
                  href: '/dashboard/orders',
                  icon: <NewOrderIcon />,
                  color: 'text-[#2C6ECB]',
                  bg: 'hover:bg-[#2C6ECB]/5 hover:border-[#2C6ECB]/20',
                },
                {
                  label: 'Add Customer',
                  href: '/dashboard/customers',
                  icon: <AddCustomerIcon />,
                  color: 'text-purple-600',
                  bg: 'hover:bg-purple-50 hover:border-purple-200',
                },
                {
                  label: 'Add Discount',
                  href: '/dashboard/discounts/add',
                  icon: <DiscountIcon />,
                  color: 'text-amber-600',
                  bg: 'hover:bg-amber-50 hover:border-amber-200',
                },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`flex flex-col items-center gap-2 p-3.5 border border-[#E1E3E5] rounded-xl ${action.bg} transition-all duration-150 no-underline text-center group`}
                >
                  <span
                    className={`${action.color} transition-transform duration-150 group-hover:scale-110`}
                  >
                    {action.icon}
                  </span>
                  <span className='text-[11.5px] font-medium text-[#202223]'>
                    {action.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Top Products */}
          {topProducts.length > 0 && (
            <div className='bg-white border border-[#E1E3E5] rounded-2xl overflow-hidden shadow-sm'>
              <div className='px-5 py-4 border-b border-[#F1F1F1]'>
                <SectionHeader
                  title='Top Products'
                  link='/dashboard/products'
                  linkLabel='View all'
                />
              </div>
              <div className='divide-y divide-[#F6F6F7]'>
                {topProducts.map(
                  (
                    product: {
                      id: string
                      name: string
                      stock: number
                      price: number
                    },
                    i: number,
                  ) => (
                    <div
                      key={product.id}
                      className='flex items-center gap-3 px-5 py-3 hover:bg-[#FAFAFA] transition-colors duration-150'
                    >
                      <span className='text-[11px] font-bold text-[#C4C8CC] w-4 shrink-0 tabular-nums'>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className='flex-1 min-w-0'>
                        <p className='text-[12.5px] font-medium text-[#202223] truncate'>
                          {product.name}
                        </p>
                        <p className='text-[11px] text-[#B0B5BA] mt-0.5'>
                          {product.stock} in stock
                        </p>
                      </div>
                      <p className='text-[12.5px] font-semibold text-[#202223] shrink-0'>
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
